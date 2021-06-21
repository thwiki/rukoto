import { mwn } from 'mwn';
import { Job } from '../decorators';
import { Log, Token } from '../services';

@Job({
	trigger: '30 16 * * *',
	active: true,
})
export class ReplyRelationshipRequestJob {
	constructor(private bot: mwn, private log: Log, private token: Token) {}

	async run() {
		const result = (
			await this.bot.request({
				action: 'maintenance',
				script: 'reply-relationship-request',
				token: await this.token.get('maintenance'),
			})
		)?.maintenance;

		this.log.verbose(result);
		return true;
	}
}
