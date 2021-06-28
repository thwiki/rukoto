import { mwn } from 'mwn';
import { Job } from '../decorators';
import { Log } from '../services/log';
import { Tokener } from '../services/tokener';

@Job({
	trigger: '15 5 * * 3',
	active: true,
})
export class CleanPagelinksJob {
	constructor(private bot: mwn, private log: Log, private token: Tokener) {}

	async run() {
		const result = (
			await this.bot.request({
				action: 'maintenance',
				script: 'clean-pagelinks',
				token: await this.token.get('maintenance'),
			})
		)?.maintenance;

		this.log.verbose(result);
		return true;
	}
}
