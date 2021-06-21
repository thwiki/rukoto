import { mwn } from 'mwn';

type TokenType = 'createaccount' | 'csrf' | 'login' | 'maintenance' | 'patrol' | 'rollback' | 'userrights' | 'watch';

export class Token {
	constructor(private bot: mwn) {}

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
