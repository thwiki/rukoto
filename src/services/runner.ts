import chalk from 'chalk';
import { randomInt } from 'crypto';
import { mwn } from 'mwn';
import { performance } from 'perf_hooks';
import { JobClass } from '../decorators';
import { JobMetadata, ParamMetadata } from '../metadata';
import { Container, Service } from 'typedi';
import { Log } from './log';
import { Waiter } from './waiter';
import { getClassParamTypes } from '../utils/get-class-param-types';
import { getMethodParamTypes } from '../utils/get-method-param-types';

@Service({ multiple: true })
export class Runner {
	public readonly classParamTypes: any[];
	public readonly methodParamTypes: ParamMetadata[];

	constructor(private readonly waiter: Waiter, public readonly jobClass: JobClass, public readonly metadata: JobMetadata) {
		this.classParamTypes = getClassParamTypes(jobClass);
		this.methodParamTypes = getMethodParamTypes(jobClass.prototype, 'run');
	}

	run = async (...args: string[]) => {
		const jobId = randomInt(10000).toString(10).padStart(4, '0');
		const jobName = `${this.jobClass.name}.${jobId}`;
		const jobLabel = chalk.bgYellow.black(jobName);

		mwn.log(`[i] ${jobLabel} triggered`);

		let status = false;
		let done = false;
		if (this.waiter.add(1)) {
			const time = performance.now();
			try {
				const container = Container.of(jobName);
				container.set(Log, new Log(jobLabel));
				container.set(Runner, this);
				const job = new this.jobClass(
					...this.classParamTypes.map((paramtype) =>
						container.has(paramtype) ? container.get(paramtype) : Container.get(paramtype)
					)
				);

				status = await job.run(
					...this.methodParamTypes.map((type, index) => {
						const arg = args[index];
						return arg == null || arg === 'null' ? undefined : type.transform(arg);
					})
				);

				if (status) {
					mwn.log(`[S] ${jobLabel} exited successfully (${Math.round(performance.now() - time)}ms)`);
				} else {
					mwn.log(`[/] ${jobLabel} exited with nothing to do (${Math.round(performance.now() - time)}ms)`);
				}
			} catch (e: unknown) {
				mwn.log(`[E] ${jobLabel} exited with an error (${Math.round(performance.now() - time)}ms)`);
				if (e instanceof Error) {
					mwn.log(`[E] ${jobLabel} ${e?.name ?? ''} ${e?.message ?? ''}`);
				} else {
					mwn.log(`[E] ${jobLabel} ${e?.toString() ?? 'Unknown error'}`);
				}
				status = false;
			}

			done = this.waiter.done();
		} else {
			mwn.log(`[/] ${jobLabel} was blocked because Rukoto is trying to exit`);
		}

		if (!done) {
			mwn.log(`[V] Rukoto is waiting ${this.waiter.count} jobs to complete before exiting`);
		}

		return status;
	};
}
