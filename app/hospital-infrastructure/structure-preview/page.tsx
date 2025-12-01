"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button } from "@/components/ui/Button";

export default function HospitalInfrastructureStructurePreviewPage() {
  const applyZoom = (direction: "in" | "out") => {
    const container = document.querySelector(".hierarchy-container");
    if (!container) {
      return;
    }
    const currentScale = parseFloat(container.getAttribute("data-scale") || "1");
    const delta = direction === "in" ? 0.1 : -0.1;
    const nextScale = direction === "in" ? currentScale + delta : Math.max(0.1, currentScale + delta);
    container.setAttribute("data-scale", nextScale.toFixed(2));
    (container as HTMLElement).style.transform = `scale(${nextScale})`;
  };

  const resetZoom = () => {
    const container = document.querySelector(".hierarchy-container");
    if (!container) {
      return;
    }
    container.setAttribute("data-scale", "1");
    (container as HTMLElement).style.transform = "scale(1)";
  };

  const handleDownloadPDF = async () => {
    try {
      const wrapper = document.querySelector(".hierarchy-wrapper") as HTMLElement | null;
      const container = document.querySelector(".hierarchy-container") as HTMLElement | null;
      if (!wrapper || !container) {
      alert("Nothing to export yet.");
        return;
      }

      const originalScale = container.getAttribute("data-scale") || "1";
      container.setAttribute("data-scale", "1");
      container.style.transform = "scale(1)";

      const originalOverflow = wrapper.style.overflow;
      wrapper.style.overflow = "visible";

      await new Promise((resolve) => setTimeout(resolve, 120));

      const canvas = await html2canvas(container, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight,
        width: container.scrollWidth,
        height: container.scrollHeight,
      });

      wrapper.style.overflow = originalOverflow;
      container.setAttribute("data-scale", originalScale);
      container.style.transform = `scale(${originalScale})`;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save("apollo-hospital-hierarchy.pdf");
      alert("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF");
    }
  };

  return (
    <AppShell>
      <div className="flex flex-1 flex-col gap-6 px-8 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading
            title="Hierarchy Presentation"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button size="small" variant="outline" onClick={() => applyZoom("in")}>
              Zoom In
            </Button>
            <Button size="small" variant="outline" onClick={() => applyZoom("out")}>
              Zoom Out
            </Button>
            <Button size="small" variant="ghost" onClick={resetZoom}>
              Reset View
            </Button>
            <Button size="small" onClick={handleDownloadPDF}>
              Download PDF
            </Button>
          </div>
        </div>

        <div className="hierarchy-wrapper overflow-auto rounded-3xl border border-[#E1E8E1] bg-white p-6 shadow-[0px_24px_60px_rgba(47,72,61,0.08)]" style={{ height: "calc(100vh - 320px)" }}>
          <div
            className="hierarchy-container origin-top-left transition-transform"
            data-scale="1"
            style={{ padding: "48px 160px 120px 160px", display: "inline-block" }}
          >
            <style>{`
              .node {
                border: 2px solid hsl(var(--border));
                background: hsl(var(--card));
                color: hsl(var(--card-foreground));
                padding: 12px 20px;
                border-radius: 4px;
                text-align: center;
                font-weight: 500;
                min-width: 140px;
                margin: 10px;
              }
              .hospital { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); font-size: 18px; font-weight: 700; padding: 16px 32px; }
              .building { background: hsl(220 60% 95%); border-color: hsl(220 60% 60%); font-weight: 600; color: hsl(220 60% 20%); }
              .block { background: hsl(200 50% 92%); border-color: hsl(200 50% 50%); }
              .floor { background: hsl(180 40% 90%); border-color: hsl(180 40% 45%); }
              .department { background: hsl(160 35% 88%); border-color: hsl(160 35% 40%); }
              .room { background: hsl(140 30% 86%); border-color: hsl(140 30% 35%); font-size: 13px; }
              .details { background: hsl(120 25% 94%); border-color: hsl(120 25% 50%); font-size: 11px; padding: 8px 12px; min-width: 180px; line-height: 1.4; }
              .line { border-left: 2px solid hsl(var(--border)); height: 40px; width: 0; margin: 0 auto; }
              .line-h { border-top: 2px solid hsl(var(--border)); height: 0; flex: 1; margin-top: 20px; }
              .connector { display: flex; justify-content: center; align-items: flex-start; }
            `}</style>

            {/* Apollo Hospital */}
            <div className="flex flex-col items-center">
              <div className="node hospital">Apollo Hospital</div>
              <div className="line" />

              {/* Buildings Row */}
              <div className="connector">
                <div className="line-h" />
                <div className="flex gap-40">
                  {/* Building A */}
                  <div className="flex flex-col items-center">
                    <div className="node building">Building A</div>
                    <div className="line" />

                    {/* Blocks Row */}
                    <div className="connector">
                      <div className="line-h" />
                      <div className="flex gap-20">
                        {/* Block A */}
                        <div className="flex flex-col items-center">
                          <div className="node block">Block A</div>
                          <div className="line" />

                          {/* Floors Row */}
                          <div className="connector">
                            <div className="line-h" />
                            <div className="flex gap-12">
                              {/* Ground Floor */}
                              <div className="flex flex-col items-center">
                                <div className="node floor">Ground Floor</div>
                                <div className="line" />

                                {/* Departments Row */}
                                <div className="connector">
                                  <div className="line-h" />
                                  <div className="flex gap-8">
                                    {/* Department 1 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 1</div>
                                      <div className="line" />

                                      <div className="connector">
                                        <div className="line-h" />
                                        <div className="flex gap-6">
                                          {/* Room 1 */}
                                          <div className="flex flex-col items-center">
                                            <div className="node room">Room 1</div>
                                            <div className="line" />
                                            <div className="node details">
                                              AC / Non-AC
                                              <br />
                                              Private
                                              <br />
                                              Toilet: English or Indian
                                              <br />
                                              Deluxe or Super Deluxe
                                            </div>
                                          </div>

                                          {/* Room 2 */}
                                          <div className="flex flex-col items-center">
                                            <div className="node room">Room 2</div>
                                            <div className="line" />
                                            <div className="node details">
                                              AC / Non-AC
                                              <br />
                                              Private
                                              <br />
                                              Toilet: English or Indian
                                              <br />
                                              Deluxe or Super Deluxe
                                            </div>
                                          </div>
                                        </div>
                                        <div className="line-h" />
                                      </div>
                                    </div>

                                    {/* Department 2 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 2</div>
                                      <div className="line" />

                                      <div className="connector">
                                        <div className="line-h" />
                                        <div className="flex gap-6">
                                          {/* Room 3 */}
                                          <div className="flex flex-col items-center">
                                            <div className="node room">Room 3</div>
                                            <div className="line" />
                                            <div className="node details">
                                              AC / Non-AC
                                              <br />
                                              Private
                                              <br />
                                              Toilet: English or Indian
                                              <br />
                                              Deluxe or Super Deluxe
                                            </div>
                                          </div>

                                          {/* Room 4 */}
                                          <div className="flex flex-col items-center">
                                            <div className="node room">Room 4</div>
                                            <div className="line" />
                                            <div className="node details">
                                              AC / Non-AC
                                              <br />
                                              Private
                                              <br />
                                              Toilet: English or Indian
                                              <br />
                                              Deluxe or Super Deluxe
                                            </div>
                                          </div>
                                        </div>
                                        <div className="line-h" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="line-h" />
                                </div>
                              </div>

                              {/* 1st Floor */}
                              <div className="flex flex-col items-center">
                                <div className="node floor">1st Floor</div>
                                <div className="line" />

                                <div className="connector">
                                  <div className="line-h" />
                                  <div className="flex gap-8">
                                    {/* Department 3 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 3</div>
                                      <div className="line" />

                                      <div className="connector">
                                        <div className="line-h" />
                                        <div className="flex gap-6">
                                          {/* Room 5 */}
                                          <div className="flex flex-col items-center">
                                            <div className="node room">Room 5</div>
                                            <div className="line" />
                                            <div className="node details">
                                              AC / Non-AC
                                              <br />
                                              Private
                                              <br />
                                              Toilet: English or Indian
                                              <br />
                                              Deluxe or Super Deluxe
                                            </div>
                                          </div>

                                          {/* Room 6 */}
                                          <div className="flex flex-col items-center">
                                            <div className="node room">Room 6</div>
                                            <div className="line" />
                                            <div className="node details">
                                              AC / Non-AC
                                              <br />
                                              Private
                                              <br />
                                              Toilet: English or Indian
                                              <br />
                                              Deluxe or Super Deluxe
                                            </div>
                                          </div>
                                        </div>
                                        <div className="line-h" />
                                      </div>
                                    </div>

                                    {/* Department 4 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 4</div>
                                      <div className="line" />

                                      <div className="connector">
                                        <div className="line-h" />
                                        <div className="flex gap-6">
                                          {/* Room 7 */}
                                          <div className="flex flex-col items-center">
                                            <div className="node room">Room 7</div>
                                            <div className="line" />
                                            <div className="node details">
                                              AC / Non-AC
                                              <br />
                                              Private
                                              <br />
                                              Toilet: English or Indian
                                              <br />
                                              Deluxe or Super Deluxe
                                            </div>
                                          </div>

                                          {/* Room 8 */}
                                          <div className="flex flex-col items-center">
                                            <div className="node room">Room 8</div>
                                            <div className="line" />
                                            <div className="node details">
                                              AC / Non-AC
                                              <br />
                                              Private
                                              <br />
                                              Toilet: English or Indian
                                              <br />
                                              Deluxe or Super Deluxe
                                            </div>
                                          </div>
                                        </div>
                                        <div className="line-h" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="line-h" />
                                </div>
                              </div>
                            </div>
                            <div className="line-h" />
                          </div>
                        </div>

                        {/* Block B */}
                        <div className="flex flex-col items-center">
                          <div className="node block">Block B</div>
                          <div className="line" />

                          <div className="connector">
                            <div className="line-h" />
                            <div className="flex gap-12">
                              {/* Ground Floor */}
                              <div className="flex flex-col items-center">
                                <div className="node floor">Ground Floor</div>
                                <div className="line" />

                                <div className="connector">
                                  <div className="line-h" />
                                  <div className="flex gap-8">
                                    {/* Department 5 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 5</div>
                                      <div className="line" />
                                      <div className="flex flex-col items-center">
                                        <div className="node room">Room 9</div>
                                        <div className="line" />
                                        <div className="node details">
                                          AC / Non-AC
                                          <br />
                                          Private
                                          <br />
                                          Toilet: English or Indian
                                          <br />
                                          Deluxe or Super Deluxe
                                        </div>
                                      </div>
                                    </div>

                                    {/* Department 6 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 6</div>
                                      <div className="line" />
                                      <div className="flex flex-col items-center">
                                        <div className="node room">Room 10</div>
                                        <div className="line" />
                                        <div className="node details">
                                          AC / Non-AC
                                          <br />
                                          Private
                                          <br />
                                          Toilet: English or Indian
                                          <br />
                                          Deluxe or Super Deluxe
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="line-h" />
                                </div>
                              </div>

                              {/* 1st Floor */}
                              <div className="flex flex-col items-center">
                                <div className="node floor">1st Floor</div>
                                <div className="line" />

                                <div className="connector">
                                  <div className="line-h" />
                                  <div className="flex gap-8">
                                    {/* Department 7 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 7</div>
                                      <div className="line" />
                                      <div className="flex flex-col items-center">
                                        <div className="node room">Room 11</div>
                                        <div className="line" />
                                        <div className="node details">
                                          AC / Non-AC
                                          <br />
                                          Private
                                          <br />
                                          Toilet: English or Indian
                                          <br />
                                          Deluxe or Super Deluxe
                                        </div>
                                      </div>
                                    </div>

                                    {/* Department 8 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 8</div>
                                      <div className="line" />
                                      <div className="flex flex-col items-center">
                                        <div className="node room">Room 12</div>
                                        <div className="line" />
                                        <div className="node details">
                                          AC / Non-AC
                                          <br />
                                          Private
                                          <br />
                                          Toilet: English or Indian
                                          <br />
                                          Deluxe or Super Deluxe
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="line-h" />
                                </div>
                              </div>
                            </div>
                            <div className="line-h" />
                          </div>
                        </div>
                      </div>
                      <div className="line-h" />
                    </div>
                  </div>

                  {/* Building B */}
                  <div className="flex flex-col items-center">
                    <div className="node building">Building B</div>
                    <div className="line" />

                    <div className="connector">
                      <div className="line-h" />
                      <div className="flex gap-20">
                        {/* Block A */}
                        <div className="flex flex-col items-center">
                          <div className="node block">Block A</div>
                          <div className="line" />

                          <div className="connector">
                            <div className="line-h" />
                            <div className="flex gap-12">
                              {/* Ground Floor */}
                              <div className="flex flex-col items-center">
                                <div className="node floor">Ground Floor</div>
                                <div className="line" />

                                <div className="connector">
                                  <div className="line-h" />
                                  <div className="flex gap-8">
                                    {/* Department 9 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 9</div>
                                      <div className="line" />
                                      <div className="flex flex-col items-center">
                                        <div className="node room">Room 13</div>
                                        <div className="line" />
                                        <div className="node details">
                                          AC / Non-AC
                                          <br />
                                          Private
                                          <br />
                                          Toilet: English or Indian
                                          <br />
                                          Deluxe or Super Deluxe
                                        </div>
                                      </div>
                                    </div>

                                    {/* Department 10 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 10</div>
                                      <div className="line" />
                                      <div className="flex flex-col items-center">
                                        <div className="node room">Room 14</div>
                                        <div className="line" />
                                        <div className="node details">
                                          AC / Non-AC
                                          <br />
                                          Private
                                          <br />
                                          Toilet: English or Indian
                                          <br />
                                          Deluxe or Super Deluxe
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="line-h" />
                                </div>
                              </div>

                              {/* 1st Floor */}
                              <div className="flex flex-col items-center">
                                <div className="node floor">1st Floor</div>
                                <div className="line" />

                                <div className="connector">
                                  <div className="line-h" />
                                  <div className="flex gap-8">
                                    {/* Department 11 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 11</div>
                                      <div className="line" />
                                      <div className="flex flex-col items-center">
                                        <div className="node room">Room 15</div>
                                        <div className="line" />
                                        <div className="node details">
                                          AC / Non-AC
                                          <br />
                                          Private
                                          <br />
                                          Toilet: English or Indian
                                          <br />
                                          Deluxe or Super Deluxe
                                        </div>
                                      </div>
                                    </div>

                                    {/* Department 12 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 12</div>
                                      <div className="line" />
                                      <div className="flex flex-col items-center">
                                        <div className="node room">Room 16</div>
                                        <div className="line" />
                                        <div className="node details">
                                          AC / Non-AC
                                          <br />
                                          Private
                                          <br />
                                          Toilet: English or Indian
                                          <br />
                                          Deluxe or Super Deluxe
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="line-h" />
                                </div>
                              </div>
                            </div>
                            <div className="line-h" />
                          </div>
                        </div>

                        {/* Block B */}
                        <div className="flex flex-col items-center">
                          <div className="node block">Block B</div>
                          <div className="line" />

                          <div className="connector">
                            <div className="line-h" />
                            <div className="flex gap-12">
                              {/* Ground Floor */}
                              <div className="flex flex-col items-center">
                                <div className="node floor">Ground Floor</div>
                                <div className="line" />

                                <div className="connector">
                                  <div className="line-h" />
                                  <div className="flex gap-8">
                                    {/* Department 13 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 13</div>
                                      <div className="line" />
                                      <div className="flex flex-col items-center">
                                        <div className="node room">Room 17</div>
                                        <div className="line" />
                                        <div className="node details">
                                          AC / Non-AC
                                          <br />
                                          Private
                                          <br />
                                          Toilet: English or Indian
                                          <br />
                                          Deluxe or Super Deluxe
                                        </div>
                                      </div>
                                    </div>

                                    {/* Department 14 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 14</div>
                                      <div className="line" />
                                      <div className="flex flex-col items-center">
                                        <div className="node room">Room 18</div>
                                        <div className="line" />
                                        <div className="node details">
                                          AC / Non-AC
                                          <br />
                                          Private
                                          <br />
                                          Toilet: English or Indian
                                          <br />
                                          Deluxe or Super Deluxe
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="line-h" />
                                </div>
                              </div>

                              {/* 1st Floor */}
                              <div className="flex flex-col items-center">
                                <div className="node floor">1st Floor</div>
                                <div className="line" />

                                <div className="connector">
                                  <div className="line-h" />
                                  <div className="flex gap-8">
                                    {/* Department 15 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 15</div>
                                      <div className="line" />
                                      <div className="flex flex-col items-center">
                                        <div className="node room">Room 19</div>
                                        <div className="line" />
                                        <div className="node details">
                                          AC / Non-AC
                                          <br />
                                          Private
                                          <br />
                                          Toilet: English or Indian
                                          <br />
                                          Deluxe or Super Deluxe
                                        </div>
                                      </div>
                                    </div>

                                    {/* Department 16 */}
                                    <div className="flex flex-col items-center">
                                      <div className="node department">Department 16</div>
                                      <div className="line" />
                                      <div className="flex flex-col items-center">
                                        <div className="node room">Room 20</div>
                                        <div className="line" />
                                        <div className="node details">
                                          AC / Non-AC
                                          <br />
                                          Private
                                          <br />
                                          Toilet: English or Indian
                                          <br />
                                          Deluxe or Super Deluxe
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="line-h" />
                                </div>
                              </div>
                            </div>
                            <div className="line-h" />
                          </div>
                        </div>
                      </div>
                      <div className="line-h" />
                    </div>
                  </div>
                </div>
                <div className="line-h" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

