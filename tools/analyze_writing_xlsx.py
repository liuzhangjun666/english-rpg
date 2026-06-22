import re
import sys
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
path = r'c:\Users\Administrator\Documents\WeChat Files\wxid_znj0gx1tx1zq22\FileStorage\File\2026-05\小升初题库\小升初题库\写作.xlsx'
df = pd.read_excel(path)
print('题型分布:', df['题型'].value_counts().to_dict())
print('词数要求 unique:')
for v in df['词数要求'].unique():
    print(' -', v)
print('---')
for _, row in df.iterrows():
    m = re.search(r"['\"]([^'\"]+)['\"]", str(row['题目']))
    title = m.group(1) if m else str(row['题目'])[:50]
    passage_hint = '续写' if '开头' in str(row['题目']) or str(row['参考范文']).startswith('The ') else '命题'
    print(int(row['序号']), row['题型'], passage_hint, title, '|', row['词数要求'])
