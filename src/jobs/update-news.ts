import { mwn } from 'mwn';
import { DateTime } from 'luxon';
import { Job } from '../decorators';

@Job({
	trigger: '30 2 * * *',
	command: 'update-news',
	active: true,
})
export class UpdateNewsJob {
	constructor(private bot: mwn) {}

	async run() {
		const currentTime = DateTime.fromISO(await this.bot.getServerTime());

		await this.bot.edit('新闻', (rev) => {
			const lines = rev.content.replace(/<\/?onlyinclude>[\r\n]*/g, '').split(/[\r\n]/);

			const list = [];
			const minIncludedLines = 8;
			let lastIndex = -1;
			let currentIndex = 0;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const matches = line.match(/^\*\w?.*?\|\s*日期\s*=\s*(\d+)-(\d+)-(\d+)\|/);

				if (matches) {
					const eventTime = DateTime.fromISO(`${matches[1]}-${matches[2]}-${matches[3]}`, { zone: 'UTC+8' });
					const daysDifference = Math.floor((eventTime.toMillis() - currentTime.toMillis()) / 86400000);

					list[currentIndex] = i;
					if (lastIndex === -1 && currentIndex >= minIncludedLines - 1 && daysDifference < -1) lastIndex = currentIndex;
					++currentIndex;
				}
			}
			if (lastIndex === -1) lastIndex = currentIndex;

			lines.splice(list[lastIndex - minIncludedLines + 1], 0, '<onlyinclude>');
			lines.splice(list[lastIndex] + 2, 0, '</onlyinclude>');

			return {
				text: lines.join('\n'),
				summary: '更新新闻',
				minor: true,
			};
		});

		return true;
	}
}
