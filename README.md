## Applanga GitHub Workflow Setup Action

This action installs the [Applanga Commandline Interface](https://www.applanga.com/docs/integration-documentation/cli) and enables:
* pushing sources for translation from your GitHub repository into a [Applanga](https://www.applanga.com) project, and 
* pulling the translated files from the [Applanga](https://www.applanga.com) dashboard into your repository.

The benefit of using [GitHub Workflows](https://help.github.com/en/actions/configuring-and-managing-workflows) for this is that you can automate your localization process without the need to share any repository credentials with your localization provider.

### Setup

To use [GitHub Workflows](https://help.github.com/en/actions/configuring-and-managing-workflows) on your repository you need to create a folder called `.github/workflows/` and place the workflow configuration `.yml` files in there. Additionally you also need a `.applanga.json` configuration file present in your repository.

For a detailed example with setup instructions see the [applanga/github-workflow-example](https://github.com/applanga/github-workflow-example) repository.
