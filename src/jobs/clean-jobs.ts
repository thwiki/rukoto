import { mwn } from 'mwn';
import { Job } from '../decorators';
import { Log, Token } from '../services';

@Job({
	trigger: '10 5 * * *',
	command: 'clean-jobs',
	active: true,
})
export class CleanJobsJob {
	constructor(private bot: mwn, private log: Log, private token: Token) {}

	async run() {
		const result = (
			await this.bot.request({
				action: 'maintenance',
				script: 'clean-jobs',
				token: await this.token.get('maintenance'),
			})
		)?.maintenance;

		this.log.verbose(result);
		return true;
	}
}
