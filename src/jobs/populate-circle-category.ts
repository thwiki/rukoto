import { mwn } from 'mwn';
import { Job } from '../decorators';

@Job({
	trigger: '25 1 */4 * *',
	command: 'populate-circle-category',
	active: true,
})
export class PopulateCircleCategoryJob {
	constructor(private bot: mwn) {}

	async run() {
		const circles = (await new this.bot.category('同人社团').pages()).map((circle) => circle.title);
		const circleCategories = (await new this.bot.category('社团分类').subcats()).map((circleCategory) =>
			this.bot.title.newFromText(circleCategory.title).getMain()
		);

		const missingCircleCategories = circles
			.filter((circle) => !circleCategories.includes(circle))
			.map((circle) => new this.bot.title(circle, 14).getPrefixedText());

		for await (const page of this.bot.readGen(missingCircleCategories)) {
			if (page.missing) {
				this.bot.save(page.title, '{{社团分类}}', '创建社团分类');
			} else {
				this.bot.edit(page.pageid, (rev) => {
					if (!/\{\{\s*社团分类\s*\}\}/.test(rev.content)) {
						rev.content = '{{社团分类}}\n' + rev.content.replace(/\{\{\s*(catmain)\s*\}\}\n?/gi, '');
					}
					return {
						text: rev.content,
						summary: '更新社团分类',
						minor: true,
					};
				});
			}
		}
		return true;
	}
}
