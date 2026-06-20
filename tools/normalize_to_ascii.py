#!/usr/bin/env python3
"""Normalize source to ASCII-only. Markup contexts (.js innerHTML strings, .html)
use HTML entities; CSS comments are straightened to ASCII. Idempotent."""
import os, sys
# raw codepoint -> HTML entity (for .js string-content and .html)
ENT = {'\u2014':'&mdash;','\u2013':'&ndash;','\u2019':'&rsquo;','\u2018':'&lsquo;',
       '\u201C':'&ldquo;','\u201D':'&rdquo;','\u2192':'&rarr;','\u00D7':'&times;'}
# raw codepoint -> ASCII (for .css, where the raw chars live only in comments)
CSS = {'\u2014':'-','\u2013':'-','\u2019':"'",'\u2018':"'",
       '\u201C':'"','\u201D':'"','\u2192':'->','\u00D7':'x'}
def conv(text, table):
    n=0
    for ch,rep in table.items():
        c=text.count(ch)
        if c: text=text.replace(ch,rep); n+=c
    return text,n
total=0; touched=[]
for dp,_,fns in os.walk('src'):
    for fn in sorted(fns):
        p=os.path.join(dp,fn)
        if fn.endswith(('.js','.html')): table=ENT
        elif fn.endswith('.css'): table=CSS
        else: continue
        t=open(p,encoding='utf-8').read()
        new,n=conv(t,table)
        if n:
            open(p,'w',encoding='utf-8').write(new)
            touched.append((p.replace('src/',''),n)); total+=n
for p,n in touched: print('  %-44s %d replaced'%(p,n))
print('TOTAL raw chars normalized: %d across %d files'%(total,len(touched)))
