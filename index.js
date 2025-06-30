const core = require('@actions/core');
const toolCache = require('@actions/tool-cache');
const process = require('process');
const childProcess = require('child_process');
const https = require('https');
const axios = require("axios");

async function validateSubscription() {
  const API_URL = `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`;

  try {
    await axios.get(API_URL, { timeout: 3000 });
  } catch (error) {
    if (error.isAxiosError && error.response) {
      console.error(
        "Subscription is not valid. Reach out to support@stepsecurity.io"
      );
      process.exit(1);
    } else {
      console.info("Timeout or API not reachable. Continuing to next step.");
    }
  }
}


async function getReleases() {
  return new Promise((resolve, reject) => {
    https
      .get(
        "https://api.github.com/repos/applanga/applanga-cli/releases",
        {
          headers: { "User-Agent": "Node.js" },
        },
        (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`Failed to get releases: ${res.statusCode}`));
            }
          });
        }
      )
      .on("error", (err) => {
        reject(err);
      });
  });
}

function compareVersions(v1, v2) {
  const v1Parts = v1.split(".").map(Number);
  const v2Parts = v2.split(".").map(Number);

  for (let i = 0; i < v1Parts.length; i++) {
    if (v1Parts[i] > v2Parts[i]) return 1;
    if (v1Parts[i] < v2Parts[i]) return -1;
  }

  return 0;
}

async function getLatestVersion(version) {
  const releases = await getReleases();

  // Regex patterns for the expected wildcard formats
  const majorMinorPattern = /^(\d+)\.(\d+)\.\*$/; // match x.y.*
  const majorPattern = /^(\d+)\.\*\.\*$/; // match x.*.*
  const anyVersionPattern = /^\*$/; // match *

  let latestVersion = null;

  switch (true) {
    case majorMinorPattern.test(version):
      // Major.Minor.* pattern match
      const [_, major, minor] = version.match(majorMinorPattern);
      for (const release of releases) {
        const tagName = release.tag_name;
        if (
          tagName.startsWith(`${major}.${minor}.`) &&
          !release.prerelease &&
          !release.draft &&
          (!latestVersion || compareVersions(tagName, latestVersion) > 0)
        ) {
          latestVersion = tagName;
        }
      }
      break;

    case majorPattern.test(version):
      // Major.*.* pattern match
      const [__, majorOnly] = version.match(majorPattern);
      for (const release of releases) {
        const tagName = release.tag_name;
        if (
          tagName.startsWith(`${majorOnly}.`) &&
          !release.prerelease &&
          !release.draft &&
          (!latestVersion || compareVersions(tagName, latestVersion) > 0)
        ) {
          latestVersion = tagName;
        }
      }
      break;

    case anyVersionPattern.test(version):
      // * pattern match
      for (const release of releases) {
        const tagName = release.tag_name;
        if (
          !release.prerelease &&
          !release.draft &&
          (!latestVersion || compareVersions(tagName, latestVersion) > 0)
        ) {
          latestVersion = tagName;
        }
      }
      break;

    default:
      throw new Error(
        `Invalid version pattern: ${version}. Accepted patterns: *, x.*.*, x.y.*`
      );
  }

  return latestVersion;
}

async function run() {
	try {
    await validateSubscription()
		const applanga = 'applanga'
		const osPlatform = process.platform;
		var url = '', extractedFile = '';
		//getting version from workflow input
		let version = core.getInput('version');

		// Resolve version using wildcard
		if (version.includes('*')) {
			version = await getLatestVersion(version);
			if (!version) {
				core.setFailed(`No matching version found for: ${core.getInput('version')}`);
				return;
			}
		}

		//checking if the file was alredy downloaded
		//if so, no need to redownload 
		const cachePath = toolCache.find(applanga, version);
		if (cachePath && cachePath !== '') {
			core.addPath(cachePath);
			return;
		}

		//figuring out teh download path
		switch (osPlatform) {
			case 'win32':
				url = 'https://github.com/applanga/applanga-cli/releases/download/' + version + '/applanga_windows.zip';
				break;
			case 'darwin':
				url = 'https://github.com/applanga/applanga-cli/releases/download/' + version + '/applanga_osx.tar.gz';
				break;
			case 'linux':
				url = 'https://github.com/applanga/applanga-cli/releases/download/' + version + '/applanga_linux.tar.gz';
				break;
			default:
				core.setFailed('Unsupported OS system');
				return;
		}
		const downloaded = await toolCache.downloadTool(url);

		//unpacking the downloaded file
		switch (osPlatform) {
			case 'win32':
				extractedFile = await toolCache.extractZip(downloaded, 'extracted');
				break;
			case 'darwin':
			case 'linux':
				extractedFile = await toolCache.extractTar(downloaded, 'extracted');
				break;
			default:
				core.setFailed('Unsupported OS system');
				return;
		}

		//adding teh path to teh enviroment
		const finalPath = await toolCache.cacheDir(extractedFile, applanga, version);
		core.addPath(finalPath);

		//setting rights to run the command
		if (osPlatform !== 'win32') {
			childProcess.execFile('chmod', ['+x', `${finalPath}/${applanga}`]);
		}
	} catch (err) {
		core.setFailed(err);
	}
}

run();
