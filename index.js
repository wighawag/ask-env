#!/usr/bin/env node
const fs = require('fs');
const {program} = require('commander');
const editDotenv = require('edit-dotenv');
const prompts = require('prompts');
const {parse: parseEnv} = require('dotenv');
const pkg = require('./package.json');

// based on https://github.com/stevenvachon/dotenv-prompt/blob/588fbf03a3004c956863097092e35103b3a035cc/es2017/index.js

async function askFor(env, varnames) {
	const answers = {};
	for (const varname of varnames) {
		let [message, param, name] = varname.split(':');
		if (!name) {
			name = param;
			if (!name) {
				name = message;
				message = `Please provide value for ${name}`;
				param = '!';
			} else {
				param = '!';
			}
		}
		const response = await prompts({
			type: 'text',
			name: 'value',
			message,
			initial: env[name],
			validate: (v) => (param === '!' ? (v ? true : 'please provide a value') : true),
		});
		answers[name] = response.value;
	}

	return Object.keys(answers).reduce((result, varname) => {
		if (!answers[varname] || (varname in env && answers[varname] === env[varname])) {
			delete answers[varname];
		}
		return result;
	}, answers);
}

async function execute(variables, options) {
	const envPath = options.file || '.env';
	let envString;
	try {
		envString = fs.readFileSync(envPath, 'utf-8');
	} catch {
		envString = '';
	}
	const env = await parseEnv(envString);

	if (!variables || variables.length === 0) {
		throw new Error('No variable(s) to prompt');
	}

	const changes = await askFor(env, variables);

	if (Object.keys(changes).length > 0) {
		Object.assign(env, changes);
		fs.writeFileSync(envPath, editDotenv(envString, changes));
	}
}

program
	.name(pkg.name)
	.description('CLI to setup .env file')
	.version(pkg.version)
	.argument('<variables...>')
	.option('-f, --file <file>', 'env file to edit')
	.action(execute);

program.parse();
