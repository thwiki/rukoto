import { mwn } from 'mwn';
import { DateTime } from 'luxon';
import { Job } from '../decorators';

@Job({
	trigger: '0 * * * *',
	active: true,
})
export class ClearSandboxJob {
	constructor(private bot: mwn) {}

	async run() {
		const sandboxs = ['沙盒', '沙盒/高级功能', '沙盒/SMW', '模板:沙盒'];

		const pages = await this.bot.read(sandboxs, {
			rvprop: ['content', 'timestamp', 'user', 'userid'],
		});

		const currentTime = DateTime.fromISO(await this.bot.getServerTime());
		let changed = 0;

		const userRightCache = new Map<number, boolean>();

		for (const page of pages) {
			const revision = page?.revisions?.[0];
			if (revision == null) continue;
			if ((revision?.content ?? '') == '') continue;

			const userid = revision.userid;
			if (userid == null || userid <= 0) continue;

			if (!userRightCache.has(userid)) {
				const userRights: string[] = (
					await this.bot.request({
						action: 'query',
						list: 'users',
						ususerids: userid,
						usprop: 'rights',
					})
				)?.query?.users?.rights;
				userRightCache.set(userid, userRights && userRights.includes('editprotected'));
			}
			if (userRightCache.get(userid)) continue;

			const lastEditTime = DateTime.fromISO(revision.timestamp);
			if (currentTime.toMillis() - lastEditTime.toMillis() < 43200000) continue;

			await this.bot.save(page.pageid, '', '清理沙盒');
			changed++;
		}

		if (changed === 0) return false;
		return true;
	}
}
