import glob
for f in glob.glob("data/articles/*.json"):
    try:
        with open(f, "r") as file: d = file.read()
        new_d = d.replace("tag=kimsondreams-21" + chr(39), "tag=kimsondreams-21")
        if d != new_d:
            with open(f, "w") as file: file.write(new_d)
            print(f"Fixed quotes in: {f}")
    except Exception as e: print(f"Error in {f}: {e}")
