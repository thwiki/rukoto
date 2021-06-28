import axios, { AxiosResponse } from 'axios';
import { mwn } from 'mwn';
import { DateTime } from 'luxon';
import { Job } from '../decorators';
import { Github } from '../services/github';

interface GroupInfo {
	build: number;
	edit: number;
	revid: number;
	pages: Page[];
}

interface Page {
	index: number;
	title: string;
	count: number;
	md: string;
}

@Job({
	trigger: '50 */4 * * *',
	command: 'update-touhou-group',
	active: true,
})
export class UpdateTouhouGroupJob {
	constructor(private bot: mwn, private github: Github) {}

	async run() {
		const info = (await axios.get<null, AxiosResponse<GroupInfo>>('https://touhou.group/info.json')).data;

		if (info == null || info?.build == null) return false;

		const buildDate = DateTime.fromMillis(info.build);

		const pages = await this.bot.read('东方相关QQ群组列表', {
			rvprop: ['content', 'timestamp'],
		});

		if (pages?.revisions?.[0]?.timestamp == null) return false;

		const editDate = DateTime.fromISO(pages.revisions[0].timestamp);

		if (buildDate > editDate) return false;

		await this.github.request('repos/thwiki/touhou-group/actions/workflows/deploy.yml/dispatches', { ref: 'master' });

		return true;
	}
}
