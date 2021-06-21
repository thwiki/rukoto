import { mwn } from 'mwn';
import { Job, Param } from '../decorators';
import { Log } from '../services';

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
	constructor(private bot: mwn, private log: Log) {}

	async run(
		@Param({ name: 'count', type: 'int', min: 0, max: 100 }) count = 1,
		@Param({ name: 'interval', type: 'int', min: 1000, max: 60000 }) interval = 1000
	) {
		while (count-- > 0) {
			this.log.verbose(`countdown ${count}`);
			await wait(interval);
		}
		return true;
	}
}
