import chalk from 'chalk';
import { mwn } from 'mwn';
import cron from 'node-cron';
import { JobClass } from '../decorators';
import { JobMetadata } from '../metadata';
import { Messenger, Waiter, Token, Runner } from '.';
import { importClassesFromDirectories } from '../utils/import-classes-from-directories';

export class Scheduler {
	public token: Token;
	public activeRunners: Runner[] = [];

	constructor(public bot: mwn, public messenger: Messenger, public waiter: Waiter) {
		this.token = new Token(bot);

		const jobClasses: JobClass[] = importClassesFromDirectories([__dirname + '/../jobs/**/*.js']);
		const jobClassesLength = jobClasses.length;

		mwn.log(`[V] Rukoto founded ${jobClassesLength} jobs`);

		for (let index = 0; index < jobClassesLength; index++) {
			const jobClass = jobClasses[index];
			const jobName = jobClass.name;
			const jobLabel = chalk.bgYellow.black(jobName);
			mwn.log(`[i] ${jobLabel} initializing (${index + 1}/${jobClassesLength})`);

			try {
				const metadata: unknown = Reflect.getMetadata('metadata', jobClass);

				if (!(metadata instanceof JobMetadata)) {
					mwn.log(`[E] ${jobLabel} is missing job metadata, skipping`);
					continue;
				}
				if (!metadata.active) {
					mwn.log(`[/] ${jobLabel} is inactive, skipping`);
					continue;
				}

				const runner = new Runner(this, jobClass, metadata);

				if (metadata.trigger === '') {
					mwn.log(`[+] ${jobLabel} runs immediately`);
					Promise.resolve().then(() => runner.run());
					mwn.log(`[S] ${jobLabel} queued`);
				} else {
					if (!cron.validate(metadata.trigger)) {
						mwn.log(`[E] trigger (${chalk.cyan(metadata.trigger ?? '')}) for ${jobLabel} is invalid, skipping`);
						continue;
					}

					mwn.log(`[+] ${jobLabel} runs on schedule (${chalk.cyan(metadata.trigger ?? '')}, ${chalk.cyan(metadata.timezone)})`);
					cron.schedule(metadata.trigger, () => runner.run(), { timezone: metadata.timezone });
					mwn.log(`[S] ${jobLabel} queued`);
				}
				this.activeRunners.push(runner);
			} catch (e: unknown) {
				mwn.log(`[E] ${jobLabel} encountered and error`);
				mwn.log(e);
			}
		}

		mwn.log(`[V] Rukoto started ${this.activeRunners.length} out of ${jobClassesLength} jobs\n`);

		this.messenger?.command(this);
	}
}
