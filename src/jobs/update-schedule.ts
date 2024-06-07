import { mwn } from 'mwn';
import { DateTime } from 'luxon';
import { Job } from '../decorators';

@Job({
	trigger: '40 2 * * *',
	command: 'update-schedule',
	active: false,
})
export class UpdateScheduleJob {
	private currentTime: DateTime;

	constructor(private bot: mwn) {}

	async run() {
		this.currentTime = DateTime.fromISO(await this.bot.getServerTime());

		await this.bot.edit('日程表', (rev) => {
			let text = rev.content.replace(/<section .+\/>[\r\n]*/g, '');

			const [textZh, textJa, textOther] = text.split(/== *(?:日本|其他国家) *==/, 3);

			const rowsZh = this.relocateSection(textZh, '国内', 8);
			const rowsJa = this.relocateSection(textJa, '日本', 10);

			const result = rowsZh.join('\n') + '== 日本 ==' + rowsJa.join('\n') + '== 其他国家 ==' + textOther;

			return {
				text: result,
				summary: '更新日程表',
				minor: true,
			};
		});

		return true;
	}

	private relocateSection(text: string, name: string, minIncludedLines: number) {
		const rows = text.split(/[\r\n]/);
		const list: number[] = [];
		let lastIndex = -1;
		let currentIndex = 0;

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const matches = row.match(/^\*.*?(\d+)年(\d+)月(\d+).*?日/);
			if (matches) {
				const eventTime = DateTime.fromISO(`${matches[1]}-${matches[2]}-${matches[3]}`, { zone: 'UTC+8' });
				const daysDifference = Math.floor((eventTime.toMillis() - this.currentTime.toMillis()) / 86400000);

				list[currentIndex] = i;
				if (lastIndex === -1 && currentIndex >= minIncludedLines - 1 && daysDifference < -1) {
					lastIndex = currentIndex;
				}
				++currentIndex;
			}
		}
		if (lastIndex === -1) lastIndex = currentIndex;

		rows.splice(list[lastIndex - minIncludedLines + 1], 0, `<section begin=${name} />`);
		rows.splice(list[lastIndex] + 2, 0, `<section end=${name} />`);

		return rows;
	}
}
