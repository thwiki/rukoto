import { mwn } from 'mwn';
import { Job, Param } from '../decorators';
import { Github } from '../services/github';
import { Log } from '../services/log';
import { Runner } from '../services/runner';
import { Tokener } from '../services/tokener';
import { Waiter } from '../services/waiter';

function wait(ms: number) {
	return new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
}

@Job({
	trigger: '',
	command: 'test',
	active: true,
})
export class TestJob {
	constructor(
		private bot: mwn,
		private log: Log,
		private github: Github,
		private tokener: Tokener,
		private waiter: Waiter,
		private runner: Runner
	) {}

	async run(
		@Param({ name: 'count', type: 'int', min: 0, max: 100 }) count = 1,
		@Param({ name: 'interval', type: 'int', min: 1000, max: 60000 }) interval = 1000
	) {
		this.log.verbose(`Connected to ${this.bot.options.apiUrl}`);
		this.checkService('bot', mwn);
		this.checkService('log', Log);
		this.checkService('github', Github);
		this.checkService('tokener', Tokener);
		this.checkService('waiter', Waiter);
		this.checkService('runner', Runner);

		while (count-- > 0) {
			this.log.verbose(`Countdown ${count}`);
			await wait(interval);
		}
		return true;
	}

	checkService(name: string, type: any) {
		const ok = this[name as keyof TestJob] instanceof type;
		if (ok) this.log.info(`Service ${type.name}: OK`);
		else this.log.error(`Service ${type.name}: Not Found`);
	}
}
