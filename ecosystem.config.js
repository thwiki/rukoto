module.exports = {
	apps: [
		{
			name: 'rukoto',
			script: './index.js',
			watch: false,
			wait_ready: true,
			autorestart: true,
			args: ['--color'],
			env: {},
		},
	],
};
