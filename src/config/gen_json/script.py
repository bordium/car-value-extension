import json
import re

INPUT = "./src/config/gen_json/makes_data.txt"
OUTPUT = "./src/config/make_model.json"
# MAKE_OUTPUT = "../makes.json"
# MODEL_OUTPUT = "../models.json"

is_make = False
outfile = open(OUTPUT, 'w')

print("Processing makes and models...")
num_pattern = r"^[12]\d{3}(?:,\s*\d{4})*$"

with open(INPUT, "r") as f:
    lines = f.readlines()
    make_model = {}
    for line in lines:
        if not line:
            continue
        line = line.split(',')
        model, make = line[0].strip(), line[1].strip()
        if make in make_model.keys():
            make_model[make].append(model)
        else:
            make_model[make] = [model]
    json_string = json.dumps(make_model, indent=4)
    outfile.write(json_string)

outfile.close()