import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only",()=>({}));

type FakeItem={id:string;media_type:"tv"|"movie";match_context:unknown;mapping_id:string}; type FakeMapping={id:string;source_title:string;source_release_date:string|null};
const state=vi.hoisted(()=>({searchMovies:vi.fn(),searchTv:vi.fn(),getTvDetails:vi.fn(),recalculateImportStatus:vi.fn(async()=>"matching"),fakeItems:[] as FakeItem[],fakeMappings:[] as FakeMapping[],completed:[] as string[]}));
const {searchMovies,searchTv,getTvDetails,completed}=state;

vi.mock("@/lib/tmdb/endpoints",()=>({searchMovies:state.searchMovies,searchTv:state.searchTv,getTvDetails:state.getTvDetails}));
vi.mock("./store",()=>({recalculateImportStatus:state.recalculateImportStatus}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({
  rpc:vi.fn(async(name:string,args:Record<string,unknown>)=>name==="claim_import_items_for_matching"?{data:state.fakeItems.map((item,index)=>({item_id:item.id,claim_token:`00000000-0000-0000-0000-${String(index).padStart(12,"0")}`})),error:null}:((state.completed.push(String(args.p_item_id)),{data:null,error:null}))),
  from:(table:string)=>({select:()=>({in:()=>({eq:async()=>({data:table==="import_items"?state.fakeItems:state.fakeMappings,error:null})})}),update:()=>({eq:()=>({eq:async()=>({error:null})})})}),
})}));

import { matchImportBatch } from "./matching";

function prepare(unique=true){state.fakeItems=Array.from({length:10},(_,index)=>({id:`item-${index}`,media_type:index<4?"tv":"movie",match_context:index<4?{version:1,kind:"tv",coordinates:[{seasonNumber:1,episodeNumber:1}]}:{version:1,kind:"movie",releaseDate:null},mapping_id:`mapping-${index}`}));state.fakeMappings=state.fakeItems.map((item,index)=>({id:item.mapping_id,source_title:unique?`Title ${index}`:"Repeated",source_release_date:null}));}
const delay=<T>(value:T,milliseconds=10)=>new Promise<T>((resolve)=>setTimeout(()=>resolve(value),milliseconds));

describe("bounded matching performance",()=>{
  beforeEach(()=>{completed.length=0;vi.clearAllMocks();prepare();searchMovies.mockImplementation((title:string)=>delay([{id:Number(title.match(/\d+/)?.[0]??50)+100,title,release_date:null}],20));searchTv.mockImplementation((title:string)=>delay([{id:Number(title.match(/\d+/)?.[0]??50)+200,name:title,first_air_date:null}],20));getTvDetails.mockImplementation(()=>delay({seasons:[{season_number:1,episode_count:1}]},30));});

  it("bounds concurrency at four and preserves successful siblings",async()=>{let active=0,max=0;searchMovies.mockImplementation(async(title:string)=>{active+=1;max=Math.max(max,active);await delay(null,10);active-=1;if(title==="Title 7")throw new Error("network");return[{id:100,title,release_date:null}];});const result=await matchImportBatch("user","import");expect(max).toBeLessThanOrEqual(4);expect(result.claimed).toBe(10);expect(completed).toHaveLength(10);expect(result.metrics.failures).toBe(1);});

  it("reuses request-local searches and TV details",async()=>{prepare(false);await matchImportBatch("user","import");expect(searchMovies).toHaveBeenCalledOnce();expect(searchTv).toHaveBeenCalledOnce();expect(getTvDetails).toHaveBeenCalledOnce();});

  it("does not make a fallback search when the constrained result is viable",async()=>{state.fakeMappings[0].source_title="Repeated (2020)";searchTv.mockResolvedValue([{id:250,name:"Repeated",first_air_date:"2020-01-01"}]);await matchImportBatch("user","import");expect(searchTv.mock.calls.filter((call)=>call[0]==="Repeated")).toHaveLength(1);expect(getTvDetails).toHaveBeenCalled();});

  it("records a sanitized representative optimized run",async()=>{const result=await matchImportBatch("user","import");expect(result.metrics).toMatchObject({items:10,tv:4,movies:6,searchRequests:10,detailsRequests:4,seasonRequests:0,fallbackSearchRequests:0,concurrency:4,claimBatchSize:10,failures:0});});
});
