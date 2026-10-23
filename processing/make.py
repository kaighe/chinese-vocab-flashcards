import json
import re

def make_graphics():
    f = open("graphics.txt", "r", encoding="utf8")
    lines = f.readlines()
    f.close()

    characters = {}
    for line in [json.loads(x) for x in lines]:
        if(line["character"] in characters):
            print("Duplicate character found:", line["character"])
        characters[line["character"]] = {
            "strokes": line["strokes"],
            "medians": line["medians"]
        }

    f = open("graphics.json", "w", encoding="utf8")
    f.write(json.dumps(characters))
    f.close()

def make_dictionary():
    f = open("cedict_ts.u8", "r", encoding="utf8")

    cedict_pattern = re.compile(r'^([^\s]+)\s+([^\s]+)\s+\[([^\]]+)\]\s+/(.+)/$')
    dictionary = {}
    duplicates = 0

    for line in f.readlines():
        if(line.startswith("#")): continue

        match = cedict_pattern.match(line)
        if(match):
            traditional, simplified, pinyin, glosses_raw = match.groups()
            definitions = [g.strip() for g in glosses_raw.split("/") if g.strip()]

            if(simplified in dictionary):
                if(dictionary[simplified]["pinyin"].lower() != pinyin.lower()):
                    print("Duplicate character found with differing pinyin:", simplified, dictionary[simplified]["pinyin"], "!=", pinyin)
                    duplicates += 1
                dictionary[simplified]["definitions"] += definitions
            else:
                dictionary[simplified] = {
                    "pinyin": pinyin,
                    "definitions": definitions
                }

    f.close()

    f = open("dictionary.json", "w", encoding="utf8")
    f.write(json.dumps(dictionary))
    f.close()

    print(f"Finished with {duplicates} duplicates.")

# make_graphics()
make_dictionary()