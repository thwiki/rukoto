import { Timezone } from 'tz-offset';
import { JobMetadataArgs } from './args/job';

export class JobMetadata {
	readonly trigger: string;
	readonly command: string;
	readonly active: boolean;
	readonly timezone: Timezone;

	constructor(args: JobMetadataArgs) {
		this.trigger = args.trigger;
		this.command = args.command ?? '';
		this.active = args.active ?? false;
		this.timezone = args.timezone ?? 'Asia/Shanghai';
	}
}
