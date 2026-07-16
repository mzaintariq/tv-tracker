import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/actions/imports",()=>({confirmImportCandidate:vi.fn(),skipImportItem:vi.fn(),skipUnresolvedImportItemsByType:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
import { ImportResolutionSections, type ResolutionItem } from "@/components/import/import-resolution-sections";

const item=(id:string,mediaType:"tv"|"movie",sourceTitle:string,matchStatus="ambiguous"):ResolutionItem=>({id,mediaType,sourceTitle,matchStatus,importMode:"history_only",candidates:[],candidateMetadata:[]});
describe("import resolution sections",()=>{
  it("renders TV and movies separately in alphabetical order",()=>{const html=renderToStaticMarkup(createElement(ImportResolutionSections,{importId:"import",items:[item("1","movie","Zulu"),item("2","tv","Beta"),item("3","tv","Alpha")]}));expect(html).toContain("TV shows needing resolution (2)");expect(html).toContain("Movies needing resolution (1)");expect(html.indexOf("Alpha")).toBeLessThan(html.indexOf("Beta"));expect(html).toContain("Skip all unresolved TV shows (2)");expect(html).toContain("Skip all unresolved Movies (1)");});
  it("retains individual manual and skip controls",()=>{const html=renderToStaticMarkup(createElement(ImportResolutionSections,{importId:"import",items:[item("1","tv","Alpha")]}));expect(html).toContain("Manual TMDB ID");expect(html).toContain("Confirm ID");expect(html).toContain("Skip this import");});
  it("renders sections when the first live items arrive and omits empty media groups",()=>{const html=renderToStaticMarkup(createElement(ImportResolutionSections,{importId:"import",items:[item("1","movie","New movie","unmatched")]}));expect(html).toContain("Movies needing resolution (1)");expect(html).not.toContain("TV shows needing resolution");});
});
