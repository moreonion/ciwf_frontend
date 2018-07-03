import yaml
from os import makedirs, path
from gettext import gettext, ngettext
from jinja2 import Environment, FileSystemLoader, Template

def filter_templates(filename):
    return filename.endswith('html') and not filename.startswith('_')

ENV = Environment(
    loader=FileSystemLoader('templates'),
    extensions=['jinja2.ext.i18n']
)
ENV.install_gettext_callables(gettext, ngettext)

with open("example_data.yml") as stream:
    example_data =  yaml.load(stream)

for file in ENV.list_templates(filter_func=filter_templates):
    template = ENV.get_template(file)
    result = 'output/{}'.format(file)
    makedirs(path.dirname(result), exist_ok=True)
    with open(result, "w") as f:
        f.write(template.render(**example_data))

