# ciwf_templates

Jinja templates used for CIWF formtool and example data.

## Requirements

- python3
- jinja2

## Config

Configure the ´assets_url´ in ´example_data.yml´ to contain an absolute URL to the assets (ie. ´file:///ciwf_assets/formtool_assets/production´).

## Development

* Edit the templates in the `templates` directory (NOTE: don’t edit ´_macro.html´).
* Render templates to the `output` sub-folder with: `python3 templates_to_html.py`
