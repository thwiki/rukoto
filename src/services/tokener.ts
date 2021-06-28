import { mwn } from 'mwn';
import { Service } from 'typedi';

export type TokenType = 'createaccount' | 'csrf' | 'login' | 'maintenance' | 'patrol' | 'rollback' | 'userrights' | 'watch';

@Service()
export class Tokener {
	constructor(private readonly bot: mwn) {}

	async get(type: TokenType): Promise<string> {
		return (
			(
				await this.bot.request({
					action: 'query',
					meta: 'tokens',
					type,
				})
			)?.query?.tokens?.[`${type}token`] ?? ''
		);
	}
}
