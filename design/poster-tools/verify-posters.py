from pathlib import Path
import json
from psd_tools import PSDImage

root = Path(__file__).resolve().parents[2]
source=root/'design'/'poster-sources'
report=[]
for name,expected in [('autumn-a3',19),('autumn-social',13)]:
    psd=PSDImage.open(source/(name+'.psd'))
    layers=[]
    for layer in psd:
        row={'name':layer.name,'kind':layer.kind,'bbox':list(layer.bbox)}
        if layer.kind=='type':row['text']=layer.text
        layers.append(row)
    assert len(layers)==expected
    assert sum(x['kind']=='type' for x in layers)>=9
    assert any('10.01' in x.get('text','') for x in layers)
    assert any('MORROW' in x.get('text','') for x in layers)
    report.append({'file':name+'.psd','size':list(psd.size),'layer_count':len(layers),'type_layer_count':sum(x['kind']=='type' for x in layers),'layers':layers,'parser':'psd-tools'})
(source/'poster-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{'file':r['file'],'size':r['size'],'layer_count':r['layer_count'],'type_layer_count':r['type_layer_count']} for r in report],ensure_ascii=False,indent=2))
