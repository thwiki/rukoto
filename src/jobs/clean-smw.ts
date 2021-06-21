import { mwn } from 'mwn';
import { Job } from '../decorators';
import { Log, Token } from '../services';

@Job({
	trigger: '45 5 * * 3',
	active: false,
})
export class CleanSMWJob {
	constructor(private bot: mwn, private log: Log, private token: Token) {}

	async run() {
		const result = (
			await this.bot.request({
				action: 'maintenance',
				script: 'clean-smw',
				token: await this.token.get('maintenance'),
			})
		)?.maintenance;

		this.log.verbose(result);
		return true;
	}
}
