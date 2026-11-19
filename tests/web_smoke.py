"""Verify a served standalone checkout. Use --all to inspect every lesson and scene."""
import argparse,asyncio,json,sys
from playwright.async_api import async_playwright

async def main(url,all_lessons,selected=None):
    failures=[];rows=[]
    async with async_playwright() as p:
        b=await p.chromium.launch();page=await b.new_page(viewport={'width':1440,'height':1000})
        pageerrors=[];network=[]
        page.on('pageerror',lambda e:pageerrors.append(str(e)))
        page.on('requestfailed',lambda r:network.append({'url':r.url,'error':r.failure}) if r.resource_type in ('script','stylesheet','document') else None)
        for n in selected or (range(1,254) if all_lessons else (1,127,253)):
            pageerrors.clear();network.clear()
            try:
                # A fresh document avoids overlapping cross-document transitions in fast audit navigation.
                await page.goto('about:blank')
                response=await page.goto(url+f'ch{n:03d}/',wait_until='load')
                data=await page.evaluate('''() => {
                  const errors=[];let scenes=0;
                  for(let i=0;i<BEATS.length;i++){
                    try{seek(i,false);P.t=Math.min(.2,TIMINGS[BEATS[i].id].dur*.1);evalTo(P.t);P.t=TIMINGS[BEATS[i].id].dur*.6;evalTo(P.t);scenes++;
                      const bad=[...document.querySelectorAll('#scene *')].filter(e=>[...e.attributes].some(a=>/NaN|Infinity/.test(a.value)));
                      if(bad.length)errors.push({beat:BEATS[i].id,invalid:bad.map(e=>e.outerHTML.slice(0,300))});
                    }catch(e){errors.push({beat:BEATS[i].id,error:String(e)});}
                  }
                  stopAudio();return {number:CHAPTER.number,scenes,beats:BEATS.length,errors};
                }''')
                row={'lesson':n,'status':response.status,'data':data,'page_errors':pageerrors.copy(),'network':network.copy()}
                if response.status!=200 or data['number']!=n or data['errors'] or pageerrors or network:failures.append(n)
            except Exception as e:row={'lesson':n,'error':str(e)};failures.append(n)
            rows.append(row)
        await b.close()
    print(json.dumps({'lessons':rows,'failures':failures},ensure_ascii=False,indent=2))
    return bool(failures)
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:8765/therapeutic-exercise/');ap.add_argument('--all',action='store_true');ap.add_argument('--lessons',help='Comma-separated lesson numbers');a=ap.parse_args()
    sys.exit(asyncio.run(main(a.url.rstrip('/')+'/',a.all,[int(n) for n in a.lessons.split(',')] if a.lessons else None)))
