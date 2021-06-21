import { Timezone } from 'tz-offset';
import { JobMetadataArgs } from './args/job';

export class JobMetadata {
	trigger: string;
	command: string;
	active: boolean;
	timezone: Timezone;

	constructor(args: JobMetadataArgs) {
		this.trigger = args.trigger;
		this.command = args.command ?? '';
		this.active = args.active ?? false;
		this.timezone = args.timezone ?? 'Asia/Shanghai';
	}
}
