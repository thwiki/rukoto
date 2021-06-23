import { mwn } from 'mwn';
import natsortGen from 'natsort';
import { Job } from '../decorators';

const natsort = natsortGen();

interface EventPage {
	printouts: {
		展会角色: { fulltext: string }[];
		展会作品: { fulltext: string }[];
		展会地区: { fulltext: string }[];
	};
	fulltext: string;
	fullurl: string;
	namespace: number;
	displaytitle: string;
	categories: string[];
}

interface EventThing {
	page: EventPage;
	categories: string[];
	countries: string[];
	cover: string;
	chara?: string[];
	work?: string[];
	city?: string[];
}

function chunks(arr: string[], size: number) {
	const output = [];
	for (let i = 0; i < arr.length; i += size) {
		output.push(arr.slice(i, i + size));
	}
	return output;
}

function compareEvent(a: EventPage, b: EventPage) {
	return natsort(a.fulltext, b.fulltext);
}

function pushToMap(map: Map<string, EventThing[]>, key: string, ...item: EventThing[]) {
	const arr = map.get(key);
	if (arr == null) map.set(key, item);
	else item.length && arr.push(...item);
}

function joinCover(list: string[]) {
	let cover = null;
	list = list.filter((item) => {
		const matches = item.match(/^（(.+)）$/);
		if (matches) {
			cover = matches[1];
			return false;
		}
		return true;
	});

	return cover == null ? list.join('，') : cover + '{{#info:' + list.join('，') + '|info}}';
}

function isEmpty(arr: Map<string, any> | any[] | Record<string, any>) {
	if (arr instanceof Map) {
		for (const [, item] of arr) {
			if (!isEmpty(item)) return false;
		}
		return true;
	} else if (Array.isArray(arr)) {
		for (const item of arr) {
			if (!isEmpty(item)) return false;
		}
		return true;
	} else if (typeof arr === 'object') {
		for (const key in arr) {
			if (Object.prototype.hasOwnProperty.call(arr, key)) {
				if (!isEmpty(arr[key])) return false;
			}
		}
		return true;
	} else {
		return false;
	}
}

@Job({
	trigger: '20 2 */2 * *',
	command: 'update-event-navbox',
	active: true,
})
export class UpdateEventNavboxJob {
	workList: string[][];
	charaList: string[][];
	countryList: string[];

	constructor(private bot: mwn) {}

	async run() {
		// Global Parameters
		const [workList, charaList] = (
			await this.bot.read(['官方作品顺序', '官方角色顺序'], {
				rvprop: ['content', 'timestamp', 'user', 'userid'],
			})
		).map((page) => {
			const { content } = page.revisions[0];
			if (page.title === '官方作品顺序')
				return [...content.matchAll(/^\* *(.+?)(?:=(.*))?$/gm)].map((match) => match.map((t) => (t ?? '').trim()));
			if (page.title === '官方角色顺序')
				return [...content.matchAll(/^(\*+) *(.*)?$/gm)].map((match) => match.map((t) => (t ?? '').trim()));
			return [];
		});

		this.countryList = (await this.bot.getPagesInCategory('活动举办地区分类‎')).map((country) =>
			this.bot.title.newFromText(country).getMainText()
		);
		this.workList = workList;
		this.charaList = charaList;

		// Offline Events
		const offlineEvents: EventPage[] = [];
		const offlineConventions: EventPage[] = [];
		for (const event of await this.queryEvent('分类:线下活动')) {
			if (event.categories.includes('展会类活动')) offlineConventions.push(event);
			else offlineEvents.push(event);
		}

		offlineEvents.sort(compareEvent);
		offlineConventions.sort(compareEvent);

		// Online Events
		const onlineEvents: EventPage[] = [];
		const onlineConventions: EventPage[] = [];
		for (const event of await this.queryEvent('分类:线上活动')) {
			if (event.categories.includes('展会类活动')) onlineConventions.push(event);
			else onlineEvents.push(event);
		}

		onlineEvents.sort(compareEvent);
		onlineConventions.sort(compareEvent);

		await this.bot.save(
			'模板:展会活动导航',
			this.generateEventNavbox(offlineConventions, offlineEvents, onlineConventions, onlineEvents),
			'更新展会活动导航'
		);

		return true;
	}

	private async queryEvent(conditions: string) {
		const events = (
			Object.values(
				(
					await this.bot.request({
						action: 'askargs',
						format: 'json',
						conditions,
						printouts: '展会角色|展会作品|展会地区',
						parameters: 'limit=500',
					})
				).query.results
			) as EventPage[]
		).filter((event) => event.namespace === 0 && !event.fulltext.includes('/'));

		const catPages: { pageid: number; title: string; categories: { ns: number; title: string }[] }[] = [];

		for (const chunk of chunks(
			events.map((event) => event.fulltext),
			50
		)) {
			for await (let json of this.bot.continuedQueryGen({
				action: 'query',
				prop: 'categories',
				titles: chunk,
				cllimit: 1000,
			})) {
				for (const page of Object.values(json.query.pages) as typeof catPages) {
					if (page.categories != null) {
						const found = catPages.find((catPage) => catPage.pageid === page.pageid);
						if (found) found.categories.push(...page.categories);
						else catPages.push(page);
					}
				}
			}
		}

		for (const event of events) {
			event.categories = (catPages.find((catPage) => catPage.title === event.fulltext)?.categories ?? []).map((c) =>
				this.bot.title.newFromText(c.title).getMainText()
			);
		}

		return events;
	}

	private generateEventNavbox(
		offlineConventions: EventPage[],
		offlineEvents: EventPage[],
		onlineConventions: EventPage[],
		onlineEvents: EventPage[]
	) {
		let text = '<fixed move />\n';
		text += '{{Navbox\n';
		text += '	|name = 展会活动导航\n';
		text += '	|title = 展会及活动导航\n';
		text += '	|above = {{展会活动导航/介绍}}\n';
		text += '	|class = nav-misc\n';
		text += '	<noinclude>|state = uncollapsed</noinclude>\n';
		text += '	|list1 = \n';

		text += '	{{Navbox | child\n';
		text += '		|title = [[:分类:线下活动|线下活动]]\n';
		text += '		|state = uncollapsed\n';

		text += '		|list1 = \n';
		text += this.generateEventNavboxChild(offlineConventions, '分类:展会类活动', '线下展会');
		text += '		|list2 = \n';
		text += this.generateEventNavboxChild(offlineEvents, '分类:活动类型分类', '线下其他类型活动');

		text += '	}}\n';

		text += '	|list2 = \n';

		text += '	{{Navbox | child\n';
		text += '		|title = [[:分类:线上活动|线上活动]]\n';
		text += '		|state = uncollapsed\n';

		text += '		|list1 = \n';
		text += this.generateEventNavboxChild(onlineConventions, '分类:展会类活动', '线上展会');
		text += '		|list2 = \n';
		text += this.generateEventNavboxChild(onlineEvents, '分类:活动类型分类', '线上其他类型活动');

		text += '	}}\n';
		text += '}}';
		text += '<noinclude>[[分类:导航栏模板]]</noinclude>';

		return text;
	}

	private generateEventNavboxChild(events: EventPage[], sectionCategory: string, sectionName: string) {
		const categorized = {
			日本: {
				普通: [] as EventThing[],
				题材: [] as EventThing[],
				东方: {
					普通: [] as EventThing[],
					作品: new Map<string, EventThing[]>(),
					地区: new Map<string, EventThing[]>(),
					角色: new Map<string, EventThing[]>(),
				},
			},
			中国: {
				普通: [] as EventThing[],
				东方: {
					普通: [] as EventThing[],
					地区: new Map<string, EventThing[]>(),
				},
			},
			其他: new Map<string, { 普通: EventThing[]; 东方: EventThing[] }>(),
		};

		const workMap: Record<string, string> = {};
		for (const match of this.workList) {
			pushToMap(categorized['日本']['东方']['作品'], (workMap[match[1]] = match[2] || match[1]));
		}

		const charaMap: Record<string, string> = {};
		let charaWork = '';
		for (const match of this.charaList) {
			if (match[1].length == 1) {
				charaWork = workMap[match[2]] ?? match[2];
				pushToMap(categorized['日本']['东方']['角色'], charaWork);
			} else charaMap[match[2]] = charaWork;
		}
		pushToMap(categorized['日本']['东方']['角色'], '其他');

		for (const event of events) {
			const { categories } = event;

			const countries = this.countryList
				.filter((country) => categories.includes(country))
				.map((country) => country.replace(/展会|活动/g, ''));
			if (countries.length === 0) countries.push('未归类');

			const thing: EventThing = {
				page: event,
				categories,
				countries,
				cover: event.fulltext.replace(/（(展会|活动)）/, ''),
			};

			if (countries.includes('日本')) {
				if (categories.includes('题材Only展会') || categories.includes('题材Only活动')) {
					categorized['日本']['题材'].push(thing);
				}
				if (categories.includes('全类型展会') || categories.includes('全类型活动')) {
					if (categories.includes('题材Only展会') || categories.includes('题材Only活动')) {
					} else {
						if (categories.includes('东方Only展会') || categories.includes('东方Only活动')) {
							categorized['日本']['东方']['普通'].push(thing);
						} else {
							categorized['日本']['普通'].push(thing);
						}
					}
				} else {
					if (categories.includes('角色Only展会') || categories.includes('角色Only活动')) {
						const charas = event.printouts.展会角色;
						const charaGroups: Record<string, string[]> = {};
						let charaCover = '';
						for (const { fulltext: chara } of charas) {
							if (/^（(.+)）$/.test(chara)) {
								charaCover = chara;
								continue;
							}
							const charGroup = charaMap[chara] ?? '其他';
							if (charaGroups[charGroup] == null) charaGroups[charGroup] = [];
							if (charGroup !== chara) {
								charaGroups[charGroup].push(chara);
							}
						}
						for (const chara in charaGroups) {
							if (Object.prototype.hasOwnProperty.call(charaGroups, chara)) {
								const covers = charaGroups[chara];

								if (/^（(.+)）$/.test(chara)) continue;
								if (charaCover !== '') covers.push(charaCover);
								pushToMap(categorized['日本']['东方']['角色'], chara, { ...thing, chara: covers });
							}
						}
					}
					if (categories.includes('作品Only展会') || categories.includes('作品Only活动')) {
						const works = event.printouts.展会作品;
						const workGroups: Record<string, string[]> = {};
						let workCover = '';
						for (const { fulltext: work } of works) {
							if (/^（(.+)）$/.test(work)) {
								workCover = work;
								continue;
							}
							const workGroup = workMap[work] ?? '其他';
							if (workGroups[workGroup] == null) workGroups[workGroup] = [];
							if (workGroup !== work) {
								workGroups[workGroup].push(work);
							}
						}
						for (const work in workGroups) {
							if (Object.prototype.hasOwnProperty.call(workGroups, work)) {
								const covers = workGroups[work];

								if (/^（(.+)）$/.test(work)) continue;
								if (workCover !== '') covers.push(workCover);
								pushToMap(categorized['日本']['东方']['作品'], work, { ...thing, work: covers });
							}
						}
					}
					if (categories.includes('地区Only展会') || categories.includes('地区Only活动')) {
						const regions = event.printouts.展会地区;
						for (const { fulltext: region } of regions) {
							if (region.endsWith('地方')) pushToMap(categorized['日本']['东方']['地区'], region, thing);
						}
					}
					if (
						!categories.includes('角色Only展会') &&
						!categories.includes('作品Only展会') &&
						!categories.includes('地区Only展会') &&
						!categories.includes('角色Only活动') &&
						!categories.includes('作品Only活动') &&
						!categories.includes('地区Only活动')
					) {
						if (categories.includes('东方Only展会') || categories.includes('东方Only活动')) {
							categorized['日本']['东方']['普通'].push(thing);
						} else {
							categorized['日本']['普通'].push(thing);
						}
					}
				}
			}

			if (countries.includes('中国')) {
				if (categories.includes('全类型展会') || categories.includes('全类型活动')) {
					if (categories.includes('东方Only展会') || categories.includes('东方Only活动')) {
						categorized['中国']['东方']['普通'].push(thing);
					} else {
						categorized['中国']['普通'].push(thing);
					}
				} else {
					if (categories.includes('地区Only展会') || categories.includes('地区Only活动')) {
						const regions = event.printouts.展会地区.map(({ fulltext }) => fulltext);
						let others = true;
						thing['city'] = regions.filter((region) => !region.endsWith('地方') && !region.endsWith('地区'));
						for (const region of regions) {
							if (region.endsWith('地区')) {
								pushToMap(categorized['中国']['东方']['地区'], region, thing);
								others = false;
							}
						}
						if (others) {
							for (const region of regions) {
								if (!region.endsWith('地方') && !region.endsWith('地区'))
									pushToMap(categorized['中国']['东方']['地区'], region, thing);
							}
						}
					}
					if (!categories.includes('地区Only展会') && !categories.includes('地区Only活动')) {
						if (categories.includes('东方Only展会') || categories.includes('东方Only活动')) {
							categorized['中国']['东方']['普通'].push(thing);
						} else {
							categorized['中国']['普通'].push(thing);
						}
					}
				}
			}

			if (!countries.includes('日本') && !countries.includes('中国')) {
				for (const country of countries) {
					let otherCountry = categorized['其他'].get(country);
					if (otherCountry == null) {
						categorized['其他'].set(
							country,
							(otherCountry = {
								东方: [],
								普通: [],
							})
						);
					}
					if (categories.includes('东方Only展会') || categories.includes('东方Only活动')) {
						otherCountry['东方'].push(thing);
					} else {
						otherCountry['普通'].push(thing);
					}
				}
			}
		}

		let list1Counter = 1;
		let list2Counter = 1;
		let list3Counter = 1;

		let text = '';
		text += '{{Navbox | child\n';
		text += '	|title = [[:' + sectionCategory + '|' + sectionName + ']]\n';
		text += '	|state = uncollapsed\n';
		text += '	|list' + list1Counter + ' = \n';
		text += '		{{Navbox | child\n';
		text += '			|title = 在日本举办的' + sectionName + '\n';
		text += '			|state = uncollapsed\n';
		text += '			|group' + list2Counter + ' = 不限题材\n';
		text += '			|list' + list2Counter + ' = ';
		++list2Counter;

		text += this.generateNavList(categorized['日本']['普通'].map((event) => [event.page.fulltext, event.cover])) + '\n';

		text += '			|group' + list2Counter + ' = 题材限定\n';
		text += '			|list' + list2Counter + ' = ';
		++list2Counter;

		text += this.generateNavList(categorized['日本']['题材'].map((event) => [event.page.fulltext, event.cover])) + '\n';

		if (!isEmpty(categorized['日本']['东方'])) {
			text += '			|group' + list2Counter + ' = 东方限定\n';
			text += '			|list' + list2Counter + ' = {{Navbox subgroup\n';
			++list2Counter;
			text += '				|list' + list3Counter + ' = ';
			++list3Counter;

			text += this.generateNavList(categorized['日本']['东方']['普通'].map((event) => [event.page.fulltext, event.cover])) + '\n';

			if (!isEmpty(categorized['日本']['东方']['角色'])) {
				text += '				|group' + list3Counter + ' = 角色限定\n';
				text += '				|list' + list3Counter + ' = {{Navbox subgroup\n';
				++list3Counter;
				let index = 1;
				for (const [chara, charaEvents] of categorized['日本']['东方']['角色'].entries()) {
					if (charaEvents.length === 0) continue;
					text += '					|group' + index + ' = ' + chara + '\n';
					text += '					|list' + index + ' = ';

					text +=
						this.generateNavList(charaEvents.map((event) => [event.page.fulltext, event.cover, joinCover(event.chara)])) + '\n';
					++index;
				}
				text += '				}}\n';
			}

			if (!isEmpty(categorized['日本']['东方']['作品'])) {
				text += '				|group' + list3Counter + ' = 作品限定\n';
				text += '				|list' + list3Counter + ' = {{Navbox subgroup\n';
				++list3Counter;
				let index = 1;
				for (const [work, workEvents] of categorized['日本']['东方']['作品'].entries()) {
					if (workEvents.length === 0) continue;
					text += '					|group' + index + ' = ' + work + '\n';
					text += '					|list' + index + ' = ';

					text +=
						this.generateNavList(workEvents.map((event) => [event.page.fulltext, event.cover, joinCover(event.work)])) + '\n';
					++index;
				}
				text += '				}}\n';
			}

			if (!isEmpty(categorized['日本']['东方']['地区'])) {
				text += '				|group' + list3Counter + ' = 地区限定\n';
				text += '				|list' + list3Counter + ' = {{Navbox subgroup\n';
				++list3Counter;
				let index = 1;

				for (const [region, regionEvents] of [...categorized['日本']['东方']['地区'].entries()].sort(([a], [b]) => natsort(a, b))) {
					text += '					|group' + index + ' = ' + region + '\n';
					text += '					|list' + index + ' = ';

					text += this.generateNavList(regionEvents.map((event) => [event.page.fulltext, event.cover])) + '\n';
					++index;
				}
				text += '				}}\n';
			}
			text += '			}}\n';
		}
		++list1Counter;
		list2Counter = 1;
		list3Counter = 1;
		text += '		}}\n';

		if (!isEmpty(categorized['中国'])) {
			text += '	|list' + list1Counter + ' = \n';
			text += '		{{Navbox | child\n';
			text += '			|title = 在中国举办的' + sectionName + '\n';
			text += '			|state = uncollapsed\n';

			if (!isEmpty(categorized['中国']['普通'])) {
				text += '			|group' + list2Counter + ' = 不限题材\n';
				text += '			|list' + list2Counter + ' = ';
				++list2Counter;

				text +=
					this.generateNavList(
						categorized['中国']['普通'].map((event) => [
							event.page.fulltext,
							event.cover,
							joinCover(event.page.printouts.展会地区.map(({ fulltext }) => fulltext).filter((v) => !v.endsWith('地区'))),
						])
					) + '\n';
			}

			if (!isEmpty(categorized['中国']['东方'])) {
				text += '			|group' + list2Counter + ' = 东方限定\n';
				text += '			|list' + list2Counter + ' = {{Navbox subgroup\n';
				++list2Counter;
				if (!isEmpty(categorized['中国']['东方']['普通'])) {
					text += '				|list' + list3Counter + ' = ';
					++list3Counter;

					text +=
						this.generateNavList(categorized['中国']['东方']['普通'].map((event) => [event.page.fulltext, event.cover])) + '\n';
				}

				if (!isEmpty(categorized['中国']['东方']['地区'])) {
					text += '				|group' + list3Counter + ' = 地区限定\n';
					text += '				|list' + list3Counter + ' = {{Navbox subgroup\n';
					++list3Counter;
					let $index = 1;
					for (const [region, regionEvents] of [...categorized['中国']['东方']['地区'].entries()].sort(([a], [b]) =>
						natsort(a, b)
					)) {
						text += '					|group' + $index + ' = ' + region + '\n';
						text += '					|list' + $index + ' = ';

						text +=
							this.generateNavList(
								regionEvents.map((event) => [event.page.fulltext, event.cover, joinCover(event['city'])])
							) + '\n';
						++$index;
					}
					text += '				}}\n';
				}
				++list1Counter;
				list2Counter = 1;

				text += '			}}\n';
			}
			text += '		}}\n';
		}

		if (!isEmpty(categorized['其他'])) {
			text += '	|list' + list1Counter + ' = \n';
			text += '		{{Navbox | child\n';
			text += '			|title = 在其他国家地区举办的' + sectionName + '\n';
			text += '			|state = uncollapsed\n';
			text += '			|group' + list2Counter + ' = 举办地区\n';
			text += '			|list' + list2Counter + ' = {{Navbox subgroup\n';
			++list2Counter;
			list2Counter = 1;
			list3Counter = 1;

			let $index = 1;
			for (const [region, { 普通: regionEvents, 东方: regionOnlyEvents }] of [...categorized['其他'].entries()].sort(([a], [b]) =>
				natsort(a, b)
			)) {
				text += '				|group' + $index + ' = ' + region + '\n';
				text += '				|list' + $index + ' = {{Navbox subgroup\n';
				text += '					|group' + list3Counter + ' = 不限题材\n';
				text += '					|list' + list3Counter + ' = ';
				++list3Counter;

				text +=
					this.generateNavList(
						regionEvents.map((event) => [
							event.page.fulltext,
							event.cover,
							joinCover(event.page.printouts.展会地区.map(({ fulltext }) => fulltext).filter((v) => !v.endsWith('地方'))),
						])
					) + '\n';
				text += '					|group' + list3Counter + ' = 东方限定\n';
				text += '					|list' + list3Counter + ' = ';
				++list3Counter;

				text +=
					this.generateNavList(
						regionOnlyEvents.map((event) => [
							event.page.fulltext,
							event.cover,
							joinCover(event.page.printouts.展会地区.map(({ fulltext }) => fulltext).filter((v) => !v.endsWith('地方'))),
						])
					) + '\n';
				++$index;
				text += '				}}\n';
				list3Counter = 1;
			}
			text += '			}}\n';
			text += '		}}\n';
		}
		text += '}}';

		return text;
	}

	private generateNavList(list: [string, string?, string?][]) {
		return list
			.map(
				([a, b, c]) =>
					'[[' + a + (b == null || b === '' || b === a ? '' : '|' + b) + ']]' + (c == null || c === '' ? '' : '（' + c + '）')
			)
			.join(' &bull; ');
	}
}
