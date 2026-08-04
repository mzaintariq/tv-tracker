import { describe, expect, it } from "vitest";
import { calendarDayDifference, digitalStatus, movieReleaseProximity, partitionUpcomingMovies, theatricalStatus, type MovieUpcomingRow } from "./upcoming";

const row = (overrides: Partial<MovieUpcomingRow> = {}): MovieUpcomingRow => ({ membership_id:"m",media_item_id:"i",tmdb_id:1,title:"Movie",poster_path:null,watched_at:null,is_favourite:false,theatrical_date:null,theatrical_type:null,digital_date:null,release_dates_synced_at:null,...overrides });
describe("movie Upcoming countdowns", () => {
  it("uses date-only calendar differences", () => expect(calendarDayDifference("2026-03-08", "2026-03-09")).toBe(1));
  it("formats theatrical today, tomorrow, plural, historical, limited, and missing", () => {
    expect(theatricalStatus("2026-08-04",3,"2026-08-04")).toBe("In theatres today");
    expect(theatricalStatus("2026-08-05",3,"2026-08-04")).toBe("In theatres tomorrow");
    expect(theatricalStatus("2026-08-22",3,"2026-08-04")).toBe("In theatres in 18 days");
    expect(theatricalStatus("2026-08-03",3,"2026-08-04")).toBe("Released in theatres");
    expect(theatricalStatus("2026-08-05",2,"2026-08-04")).toBe("Limited theatrical release tomorrow");
    expect(theatricalStatus(null,null,"2026-08-04")).toBe("Theatrical date not announced");
  });
  it("formats digital statuses", () => {
    expect(digitalStatus("2026-08-04","2026-08-04")).toBe("Digital release today");
    expect(digitalStatus("2026-08-05","2026-08-04")).toBe("Digital release tomorrow");
    expect(digitalStatus("2026-08-07","2026-08-04")).toBe("Digital release in 3 days");
    expect(digitalStatus("2026-08-03","2026-08-04")).toBe("Released digitally");
    expect(digitalStatus(null,"2026-08-04")).toBe("Digital date not announced");
  });
  it("classifies today and the inclusive 30-day boundary as Out Now", () => {
    const result = partitionUpcomingMovies([
      row({membership_id:"theatre-today",theatrical_date:"2026-08-04"}),
      row({membership_id:"digital-today",digital_date:"2026-08-04"}),
      row({membership_id:"ten",theatrical_date:"2026-07-25"}),
      row({membership_id:"thirty",digital_date:"2026-07-05"}),
    ],"2026-08-04");
    expect(result.outNow.map((item) => item.membership_id)).toEqual(["digital-today","theatre-today","ten","thirty"]);
  });
  it("excludes 31-day-old dates and gives future dates Coming Soon precedence", () => {
    const result = partitionUpcomingMovies([
      row({membership_id:"old",theatrical_date:"2026-07-04"}),
      row({membership_id:"mixed",theatrical_date:"2026-07-25",digital_date:"2026-08-20"}),
      row({membership_id:"missing"}),
    ],"2026-08-04");
    expect(result.outNow).toEqual([]); expect(result.comingSoon.map((item) => item.membership_id)).toEqual(["mixed"]);
    expect(result.datesNotAnnounced.map((item) => item.membership_id)).toEqual(["missing"]);
    expect([...result.outNow,...result.comingSoon,...result.datesNotAnnounced].map((item) => item.membership_id)).not.toContain("old");
  });
  it("sorts Out Now newest first with stable title ties", () => {
    const result = partitionUpcomingMovies([
      row({membership_id:"older",title:"Zulu",theatrical_date:"2026-07-25"}),
      row({membership_id:"beta",title:"Beta",digital_date:"2026-08-03"}),
      row({membership_id:"alpha",title:"Alpha",theatrical_date:"2026-08-03"}),
    ],"2026-08-04");
    expect(result.outNow.map((item) => item.membership_id)).toEqual(["alpha","beta","older"]);
  });
  it("uses the nearest future theatrical or digital date for Coming Soon", () => {
    expect(movieReleaseProximity(row({theatrical_date:"2026-08-20",digital_date:"2026-08-05"}),"2026-08-04","coming-soon")).toEqual({
      visiblePrimary:"1",visibleSecondary:"DAY",accessibleLabel:"1 day until the next release",primaryDate:"2026-08-05",
    });
    expect(movieReleaseProximity(row({theatrical_date:"2026-08-22",digital_date:"2026-08-08"}),"2026-08-04","coming-soon")).toMatchObject({visiblePrimary:"4",visibleSecondary:"DAYS",accessibleLabel:"4 days until the next release"});
  });
  it("uses the most recent historical date for Out Now", () => {
    expect(movieReleaseProximity(row({theatrical_date:"2026-07-20",digital_date:"2026-08-03"}),"2026-08-04","out-now")).toEqual({
      visiblePrimary:"1",visibleSecondary:"DAY AGO",accessibleLabel:"1 day since the latest release",primaryDate:"2026-08-03",
    });
    expect(movieReleaseProximity(row({theatrical_date:"2026-07-29",digital_date:"2026-07-20"}),"2026-08-04","out-now")).toMatchObject({visiblePrimary:"6",visibleSecondary:"DAYS AGO",accessibleLabel:"6 days since the latest release"});
  });
  it("formats today and TBA without numeric fabrication", () => {
    expect(movieReleaseProximity(row({digital_date:"2026-08-04"}),"2026-08-04","out-now")).toMatchObject({visiblePrimary:"TODAY",accessibleLabel:"The latest release is today"});
    expect(movieReleaseProximity(row(),"2026-08-04","tba")).toEqual({visiblePrimary:"TBA",visibleSecondary:null,accessibleLabel:"Release date to be announced",primaryDate:null});
  });
});
