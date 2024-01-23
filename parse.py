import pandas as pd 

df = pd.read_csv("log.csv").groupby(["Application", "Rule"]).first()
df.to_csv("log_parsed.csv")
pass
