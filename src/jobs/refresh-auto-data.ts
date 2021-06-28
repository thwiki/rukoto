import { mwn } from 'mwn';
import { Job } from '../decorators';
import { Log } from '../services/log';
import { Tokener } from '../services/tokener';

@Job({
	trigger: '25 */2 * * *',
	command: 'refresh-auto-data',
	active: true,
})
export class RefreshAutoDataJob {
	constructor(private bot: mwn, private log: Log, private token: Tokener) {}

	async run() {
		const result = (
			await this.bot.request(
				{
					action: 'maintenance',
					script: 'refresh-auto-data',
					token: await this.token.get('maintenance'),
				},
				{ timeout: 10 * 60 * 1000 }
			)
		)?.maintenance;

		this.log.verbose(result);
		return true;
	}
}
