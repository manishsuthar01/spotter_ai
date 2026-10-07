import React, { useState } from 'react';
import { FileText, Printer, ChevronLeft, ChevronRight } from 'lucide-react';

export default function EldLogSheet({ dailyLogs }) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  if (!dailyLogs || dailyLogs.length === 0) {
    return null;
  }

  const currentLog = dailyLogs[selectedDayIndex] || dailyLogs[0];
  const numDays = dailyLogs.length;

  // Grid SVG dimensions
  const svgWidth = 980;
  const svgHeight = 220;
  const labelColWidth = 140;
  const totalColWidth = 80;
  const gridWidth = svgWidth - labelColWidth - totalColWidth; // 760px
  const gridLeft = labelColWidth;
  const gridRight = gridLeft + gridWidth;

  const rowHeight = 40;
  const headerHeight = 36;
  const numRows = 4;
  const gridTop = headerHeight;
  const gridBottom = gridTop + numRows * rowHeight;

  const hourToX = (hour) => gridLeft + (hour / 24.0) * gridWidth;
  const rowToY = (lineNum) => gridTop + (lineNum - 1) * rowHeight + rowHeight / 2;

  // Build continuous polyline points for duty status step-graph
  const segments = currentLog.segments || [];
  const linePoints = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const xStart = hourToX(seg.start_hour);
    const xEnd = hourToX(seg.end_hour);
    const yVal = rowToY(seg.line_number);

    if (linePoints.length > 0) {
      const prev = linePoints[linePoints.length - 1];
      if (Math.abs(prev.x - xStart) < 0.5 && prev.y !== yVal) {
        linePoints.push({ x: xStart, y: yVal });
      } else if (prev.x !== xStart) {
        linePoints.push({ x: xStart, y: prev.y });
        linePoints.push({ x: xStart, y: yVal });
      }
    } else {
      linePoints.push({ x: xStart, y: yVal });
    }

    linePoints.push({ x: xEnd, y: yVal });
  }

  const polylineStr = linePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="eld-container" id="eld-daily-logs-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--brand-orange)" /> Driver's Daily Log (24 Hours)
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--color-secondary)' }}>
            Data-driven FMCSA ELD daily log sheets calculated from the trip schedule.
          </p>
        </div>

        <div>
          <button
            type="button"
            className="eld-tab-btn"
            onClick={handlePrint}
            style={{ background: '#ffffff', color: 'var(--color-secondary)' }}
          >
            <Printer size={15} color="var(--brand-orange)" /> Print / Export Sheet
          </button>
        </div>
      </div>

      {/* Multi-Day Navigation Tabs */}
      {numDays > 1 && (
        <div className="eld-tabs">
          <button
            type="button"
            className="eld-tab-btn"
            onClick={() => setSelectedDayIndex(Math.max(0, selectedDayIndex - 1))}
            disabled={selectedDayIndex === 0}
            style={{ opacity: selectedDayIndex === 0 ? 0.4 : 1 }}
          >
            <ChevronLeft size={16} /> Prev Day
          </button>

          {dailyLogs.map((log, idx) => (
            <button
              key={idx}
              type="button"
              className={`eld-tab-btn ${selectedDayIndex === idx ? 'active' : ''}`}
              onClick={() => setSelectedDayIndex(idx)}
            >
              Day {log.day_number} ({log.date_formatted})
            </button>
          ))}

          <button
            type="button"
            className="eld-tab-btn"
            onClick={() => setSelectedDayIndex(Math.min(numDays - 1, selectedDayIndex + 1))}
            disabled={selectedDayIndex === numDays - 1}
            style={{ opacity: selectedDayIndex === numDays - 1 ? 0.4 : 1 }}
          >
            Next Day <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Horizontally scrollable paper log container */}
      <div className="eld-scroll-wrapper">
        <div className="paper-log-sheet">
          {/* Header */}
          <div className="paper-header">
            <div className="paper-title-row">
              <div>
                <span className="paper-main-title">Drivers Daily Log</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-secondary)', marginLeft: '10px' }}>
                  (24 hours)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800 }}>
                <span>Date:</span>
                <span style={{ borderBottom: '1px solid #111827', padding: '0 12px', fontFamily: 'var(--font-mono)' }}>
                  {currentLog.month} / {currentLog.day} / {currentLog.year}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600, marginLeft: '12px' }}>
                  Day {currentLog.day_number} of {numDays}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-secondary)', marginBottom: '10px' }}>
              <span>From: <b>{currentLog.from_location}</b></span>
              <span>To: <b>{currentLog.to_location}</b></span>
              <span style={{ fontStyle: 'italic' }}>Original - File at terminal. Duplicate - Retained 8 days.</span>
            </div>

            {/* Header Fields Grid */}
            <div className="paper-meta-grid">
              <div className="paper-field-box">
                <div className="paper-field-label">Total Miles Driving Today</div>
                <div className="paper-field-val">{currentLog.total_miles_driving_today} mi</div>
              </div>
              <div className="paper-field-box">
                <div className="paper-field-label">Total Mileage Today (Odometer)</div>
                <div className="paper-field-val">{currentLog.total_mileage_today} mi</div>
              </div>
              <div className="paper-field-box">
                <div className="paper-field-label">Name of Carrier</div>
                <div className="paper-field-val">{currentLog.carrier_name}</div>
              </div>
              <div className="paper-field-box">
                <div className="paper-field-label">Vehicle Numbers (Tractor / Trailer)</div>
                <div className="paper-field-val">{currentLog.vehicle_numbers}</div>
              </div>
              <div className="paper-field-box">
                <div className="paper-field-label">Main Office Address</div>
                <div className="paper-field-val">{currentLog.main_office_address}</div>
              </div>
              <div className="paper-field-box">
                <div className="paper-field-label">Home Terminal Address</div>
                <div className="paper-field-val">{currentLog.home_terminal_address}</div>
              </div>
            </div>
          </div>

          {/* SVG Graph Grid */}
          <div className="svg-grid-container">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              width="100%"
              style={{ display: 'block', backgroundColor: '#ffffff' }}
            >
              {/* Header Bar */}
              <rect x="0" y="0" width={svgWidth} height={headerHeight} fill="#111827" />
              <text x="14" y="22" fill="#ffffff" fontSize="11" fontWeight="800" fontFamily="sans-serif">
                DUTY STATUS
              </text>
              <text x={svgWidth - 65} y="22" fill="#ffffff" fontSize="11" fontWeight="800" fontFamily="sans-serif">
                TOTAL
              </text>

              {/* Hour Labels */}
              {Array.from({ length: 25 }).map((_, h) => {
                const x = hourToX(h);
                let text = `${h}`;
                if (h === 0) text = 'Mid';
                else if (h === 12) text = 'Noon';
                else if (h === 24) text = 'Mid';
                else if (h > 12) text = `${h - 12}`;

                return (
                  <text
                    key={`hlabel_${h}`}
                    x={x}
                    y="22"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                  >
                    {text}
                  </text>
                );
              })}

              {/* Row Backgrounds & Status Row Labels */}
              {[
                { line: 1, name: '1. Off Duty', total: currentLog.totals.line1_off_duty, color: '#fbfbfb' },
                { line: 2, name: '2. Sleeper Berth', total: currentLog.totals.line2_sleeper_berth, color: '#ffffff' },
                { line: 3, name: '3. Driving', total: currentLog.totals.line3_driving, color: '#fbfbfb' },
                { line: 4, name: '4. On Duty (not driving)', total: currentLog.totals.line4_on_duty_not_driving, color: '#ffffff' },
              ].map((row) => {
                const yTop = gridTop + (row.line - 1) * rowHeight;
                return (
                  <g key={`row_${row.line}`}>
                    <rect x="0" y={yTop} width={svgWidth} height={rowHeight} fill={row.color} />
                    <line x1="0" y1={yTop + rowHeight} x2={svgWidth} y2={yTop + rowHeight} stroke="#e5e5e5" strokeWidth="1" />

                    <text
                      x="12"
                      y={yTop + rowHeight / 2 + 4}
                      fill="#111827"
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="sans-serif"
                    >
                      {row.name}
                    </text>

                    <text
                      x={svgWidth - 40}
                      y={yTop + rowHeight / 2 + 5}
                      fill="#111827"
                      fontSize="13"
                      fontWeight="800"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {row.total.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Grid Vertical Lines & Ticks */}
              {Array.from({ length: 25 }).map((_, h) => {
                const x = hourToX(h);
                return (
                  <g key={`vert_${h}`}>
                    <line
                      x1={x}
                      y1={gridTop}
                      x2={x}
                      y2={gridBottom}
                      stroke={h === 0 || h === 12 || h === 24 ? '#111827' : '#e5e5e5'}
                      strokeWidth={h === 0 || h === 12 || h === 24 ? '1.5' : '1'}
                    />

                    {h < 24 && [1, 2, 3, 4].map((lineNum) => {
                      const yTop = gridTop + (lineNum - 1) * rowHeight;
                      const x15 = hourToX(h + 0.25);
                      const x30 = hourToX(h + 0.5);
                      const x45 = hourToX(h + 0.75);

                      return (
                        <g key={`ticks_${h}_${lineNum}`}>
                          <line x1={x15} y1={yTop} x2={x15} y2={yTop + 7} stroke="#9d9d9d" strokeWidth="0.75" />
                          <line x1={x30} y1={yTop} x2={x30} y2={yTop + 13} stroke="#6b7280" strokeWidth="1" />
                          <line x1={x45} y1={yTop} x2={x45} y2={yTop + 7} stroke="#9d9d9d" strokeWidth="0.75" />
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              <line x1={gridLeft} y1={gridTop} x2={gridLeft} y2={gridBottom} stroke="#111827" strokeWidth="1.5" />
              <line x1={gridRight} y1={gridTop} x2={gridRight} y2={gridBottom} stroke="#111827" strokeWidth="1.5" />
              <line x1="0" y1={gridBottom} x2={svgWidth} y2={gridBottom} stroke="#111827" strokeWidth="1.5" />

              {/* Data-Driven Duty Status Step Line in Brand Orange */}
              {polylineStr && (
                <polyline
                  points={polylineStr}
                  fill="none"
                  stroke="#ff6422"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Total 24.00h Summary Box */}
              <rect x={svgWidth - totalColWidth} y={gridBottom - 26} width={totalColWidth} height="26" fill="#111827" />
              <text
                x={svgWidth - 40}
                y={gridBottom - 8}
                fill="#ffffff"
                fontSize="12"
                fontWeight="900"
                fontFamily="monospace"
                textAnchor="middle"
              >
                24.00h
              </text>
            </svg>
          </div>

          {/* Remarks and Recap Section */}
          <div className="paper-bottom-section">
            {/* Remarks */}
            <div className="remarks-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111827', paddingBottom: '4px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>REMARKS</span>
                <span style={{ fontSize: '9px', color: 'var(--color-muted)' }}>City, state & duty changes</span>
              </div>

              <div style={{ fontSize: '10px', color: 'var(--color-secondary)', marginBottom: '8px' }}>
                <b>Shipping Manifest:</b> {currentLog.shipping_manifest} • {currentLog.shipper_commodity}
              </div>

              {currentLog.remarks && currentLog.remarks.length > 0 ? (
                <table className="remarks-table">
                  <thead>
                    <tr>
                      <th style={{ width: '55px' }}>Time</th>
                      <th style={{ width: '120px' }}>Duty Status</th>
                      <th>Location & Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLog.remarks.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.time_str}</td>
                        <td style={{ fontWeight: 600 }}>{r.status}</td>
                        <td><b>{r.location}</b> – {r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: '11px', color: 'var(--color-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                  Continuous off-duty period. No changes of duty status during this calendar day.
                </p>
              )}
            </div>

            {/* Recap */}
            <div className="recap-box">
              <div className="recap-title">
                RECAP: 70 HOUR / 8 DAY DRIVERS
              </div>

              <div className="recap-row">
                <span>On-duty hours today:</span>
                <span className="val">{currentLog.recap?.on_duty_today?.toFixed(2)} hrs</span>
              </div>

              <div className="recap-row">
                <span>A. Total on duty last 7 days:</span>
                <span className="val">{currentLog.recap?.a_hours_last_7_days?.toFixed(2)} hrs</span>
              </div>

              <div className="recap-row bold">
                <span>B. Available tomorrow:</span>
                <span className="val" style={{ color: 'var(--brand-orange)' }}>
                  {currentLog.recap?.b_hours_available_tomorrow?.toFixed(2)} hrs
                </span>
              </div>

              <div className="recap-row">
                <span>C. Total on duty last 8 days:</span>
                <span className="val">{currentLog.recap?.c_hours_last_8_days?.toFixed(2)} hrs</span>
              </div>

              <div style={{ fontSize: '9px', color: 'var(--color-muted)', marginTop: '6px', lineHeight: 1.3 }}>
                *34 consecutive hours off resets available cycle to 70 hours.
                {currentLog.recap?.restart_occurred && (
                  <b style={{ display: 'block', color: 'var(--brand-orange)', marginTop: '2px' }}>
                    ✔ 34h Restart: 70.0h available
                  </b>
                )}
              </div>

              <div style={{ marginTop: '14px', borderTop: '1px solid #d1d5db', paddingTop: '6px', fontSize: '10px' }}>
                <div style={{ fontStyle: 'italic', color: 'var(--color-secondary)', marginBottom: '3px' }}>
                  "I certify that these entries are true and correct"
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'cursive', fontSize: '14px', color: '#111827' }}>
                    {currentLog.driver_name || 'John Doe'}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                    Driver's Signature
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
