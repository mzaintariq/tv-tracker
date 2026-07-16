import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only",()=>({}));
vi.mock("@/lib/env.server",()=>({getTmdbApiReadToken:()=>"test-token"}));
import { fetchTmdb } from "./client";

describe("TMDB bounded retry",()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it("honors a zero Retry-After and bounds 429 retries",async()=>{const request=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null,{status:429,headers:{"retry-after":"0"}})).mockResolvedValueOnce(new Response(JSON.stringify({ok:true}),{status:200}));vi.stubGlobal("fetch",request);await expect(fetchTmdb<{ok:boolean}>({path:"/test"})).resolves.toEqual({ok:true});expect(request).toHaveBeenCalledTimes(2);});
  it("stops after three network/server attempts",async()=>{const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(null,{status:503}));vi.stubGlobal("fetch",request);await expect(fetchTmdb({path:"/test"})).rejects.toMatchObject({status:503});expect(request).toHaveBeenCalledTimes(3);});
});
