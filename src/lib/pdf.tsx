/**
 * SiteBrief — Professional Daily Field Report PDF
 *
 * Design principles:
 *  - Contractor company is the primary identity (logo or name, contact info)
 *  - "Daily Field Report" document character — not a card, not an invoice
 *  - Clean typography hierarchy with Helvetica (built into react-pdf)
 *  - 2-column photo grid with page-break protection on each row
 *  - Compact fixed header/footer on every page (fixed prop)
 *  - Navy / dark-ink / light-gray palette; grayscale-safe
 *  - Company logo resolved as data URL by caller; falls back to name text
 *  - Page numbers via react-pdf render props
 *
 * Architecture:
 *  - All data passed in by caller; no Supabase calls here
 *  - generateReportPdfBlob() returns Blob; reportPdfFilename() returns string
 *  - Dynamic-imported by ReportPreviewPage to keep main bundle small
 *
 * Preservation notes:
 *  - Do NOT rewrite the Blob generation or import mechanism
 *  - The working CSP ('wasm-unsafe-eval') must stay in public/_headers
 */
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer'

// ── Design tokens (mirrored from index.css, PDF-safe values) ──────────────
const NAVY    = '#1A5276'
const INK     = '#111827'
const MUTED   = '#6B7280'
const RULE    = '#D1D5DB'
const LIGHT   = '#F3F4F6'
const WHITE   = '#FFFFFF'
const WARN_BG = '#FFFBEB'
const WARN_FG = '#92400E'

// Letter portrait in points: 612 × 792
// Margins: 48pt left/right (≈ 0.67"), 48pt top, 60pt bottom (footer space)
const MARGIN_H = 48
const MARGIN_T = 44
const MARGIN_B = 60
const CONTENT_W = 612 - MARGIN_H * 2   // 516 pt

// Photo grid: 2 columns, 12pt gap
const PHOTO_GAP  = 12
const PHOTO_W    = (CONTENT_W - PHOTO_GAP) / 2  // ~252 pt
const PHOTO_H    = Math.round(PHOTO_W * 0.75)   // ~189 pt (4:3)

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: INK,
    paddingTop: MARGIN_T + 36,     // +36 for fixed header clearance
    paddingBottom: MARGIN_B,
    paddingHorizontal: MARGIN_H,
    backgroundColor: WHITE,
    lineHeight: 1,
  },

  // ── Fixed page header (repeats on every page) ───────────────────────────
  pageHeader: {
    position: 'absolute',
    top: MARGIN_T,
    left: MARGIN_H,
    right: MARGIN_H,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: NAVY,
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    flex: 1,
  },
  logoImg: {
    height: 26,
    width: 70,
    objectFit: 'contain',
    objectPositionX: 'left',
    objectPositionY: 'bottom',
  },
  companyNameHeader: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    letterSpacing: 0.2,
  },
  pageHeaderRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  docTypeLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // ── Report identity block (first-page only, below fixed header) ──────────
  reportIdentity: {
    marginBottom: 16,
    marginTop: 4,
  },
  reportProjectName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginBottom: 6,
  },
  reportMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  reportMetaItem: {
    fontSize: 9,
    color: MUTED,
  },
  reportMetaBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: INK,
  },
  statusBadge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  statusFinal: {
    color: '#065F46',
    backgroundColor: '#D1FAE5',
  },
  statusDraft: {
    color: WARN_FG,
    backgroundColor: WARN_BG,
  },

  // ── Project info table (below report identity) ───────────────────────────
  infoTable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
    marginBottom: 18,
    borderTopWidth: 1,
    borderTopColor: RULE,
    borderLeftWidth: 1,
    borderLeftColor: RULE,
  },
  infoCell: {
    width: '50%',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: RULE,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    backgroundColor: LIGHT,
  },
  infoCellFull: {
    width: '100%',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: RULE,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    backgroundColor: LIGHT,
  },
  infoLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 9.5,
    color: INK,
    lineHeight: 1.4,
  },

  // ── Narrative sections ───────────────────────────────────────────────────
  section: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  sectionBody: {
    fontSize: 10,
    color: INK,
    lineHeight: 1.6,
  },

  // ── Photo section ────────────────────────────────────────────────────────
  photoSectionHeading: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  photoRow: {
    flexDirection: 'row',
    gap: PHOTO_GAP,
    marginBottom: PHOTO_GAP,
  },
  photoCell: {
    width: PHOTO_W,
    height: PHOTO_H,
    borderWidth: 1,
    borderColor: RULE,
    overflow: 'hidden',
  },
  photoImg: {
    width: PHOTO_W,
    height: PHOTO_H,
    objectFit: 'cover',
  },
  // When there's only 1 photo in the final row, keep it at natural width
  photoCellSingle: {
    width: PHOTO_W,
    height: PHOTO_H,
    borderWidth: 1,
    borderColor: RULE,
    overflow: 'hidden',
  },

  // ── Fixed page footer (repeats on every page) ────────────────────────────
  pageFooter: {
    position: 'absolute',
    bottom: 24,
    left: MARGIN_H,
    right: MARGIN_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: RULE,
  },
  footerLeft: {
    fontSize: 7,
    color: MUTED,
  },
  footerRight: {
    fontSize: 7,
    color: MUTED,
  },

  // ── Company contact line in footer ───────────────────────────────────────
  footerContact: {
    fontSize: 7,
    color: MUTED,
  },
})

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReportPdfData {
  reportNumber: number
  isDraft: boolean
  createdAt: string
  companyName: string
  /** Phone number stored as normalized digits, displayed formatted */
  companyPhone?: string | null
  companyEmail?: string | null
  /**
   * Company logo resolved to a data URL by the caller before generation.
   * If null/undefined the company name is rendered typographically instead.
   */
  logoDataUrl?: string | null
  projectName: string
  customerName?: string | null
  address?: string | null
  workCompleted?: string | null
  problems?: string | null
  nextSteps?: string | null
  /** Pre-resolved data URLs — signed URLs will NOT be passed here */
  photoUrls: string[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Format a 10-digit phone string → (555) 123-4567 */
function formatPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return raw // return as-is if unrecognized format
}

/** Chunk array into groups of size n */
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

/** Friendly date like "September 26, 2026" */
function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

/** Zero-padded report number like "004" */
function padReport(n: number): string {
  return String(n).padStart(3, '0')
}

// ── Document component ─────────────────────────────────────────────────────

const ReportDocument = ({ data }: { data: ReportPdfData }) => {
  const dateStr  = longDate(data.createdAt)
  const reportId = `Report #${padReport(data.reportNumber)}`
  const phoneStr = formatPhone(data.companyPhone)
  const photoRows = chunk(data.photoUrls, 2)

  // Contact line: "phone · email" — only non-null fields
  const contactParts = [phoneStr, data.companyEmail].filter(Boolean)
  const contactLine  = contactParts.join('  ·  ')

  // Footer center text: project + report ID
  const footerCenter = `${data.projectName}  ·  ${reportId}`

  return (
    <Document
      title={`${data.companyName} — ${reportId}`}
      author={data.companyName}
      subject="Daily Field Report"
      creator="SiteBrief"
    >
      <Page size="LETTER" style={s.page}>

        {/* ── Fixed page header ── */}
        <View style={s.pageHeader} fixed>
          <View style={s.pageHeaderLeft}>
            {data.logoDataUrl ? (
              <Image src={data.logoDataUrl} style={s.logoImg} />
            ) : (
              <Text style={s.companyNameHeader}>{data.companyName}</Text>
            )}
          </View>
          <View style={s.pageHeaderRight}>
            <Text style={s.docTypeLabel}>Daily Field Report</Text>
          </View>
        </View>

        {/* ── Report identity (first page) ── */}
        <View style={s.reportIdentity}>
          <Text style={s.reportProjectName}>{data.projectName}</Text>
          <View style={s.reportMetaRow}>
            <Text style={s.reportMetaBold}>{reportId}</Text>
            <Text style={s.reportMetaItem}>{dateStr}</Text>
            <Text style={[
              s.statusBadge,
              data.isDraft ? s.statusDraft : s.statusFinal,
            ]}>
              {data.isDraft ? 'DRAFT' : 'FINAL'}
            </Text>
          </View>
        </View>

        {/* ── Project / company info table ── */}
        {(() => {
          // Collect non-null cells: [label, value][]
          const cells: [string, string][] = [
            ['Company', data.companyName],
          ]
          if (data.customerName) cells.push(['Customer', data.customerName])
          if (data.address)      cells.push(['Address',  data.address])
          if (contactLine)       cells.push(['Contact',  contactLine])

          // Pair cells into rows of 2; last cell spans full width if odd
          const paired: Array<{ cells: typeof cells; full?: boolean }> = []
          for (let i = 0; i < cells.length; i += 2) {
            if (i + 1 < cells.length) {
              paired.push({ cells: [cells[i], cells[i + 1]] })
            } else {
              paired.push({ cells: [cells[i]], full: true })
            }
          }

          return (
            <View style={s.infoTable}>
              {paired.map((row, ri) =>
                row.full ? (
                  <View key={ri} style={s.infoCellFull}>
                    <Text style={s.infoLabel}>{row.cells[0][0]}</Text>
                    <Text style={s.infoValue}>{row.cells[0][1]}</Text>
                  </View>
                ) : (
                  <View key={ri} style={{ flexDirection: 'row', width: '100%' }}>
                    {row.cells.map(([label, value], ci) => (
                      <View key={ci} style={s.infoCell}>
                        <Text style={s.infoLabel}>{label}</Text>
                        <Text style={s.infoValue}>{value}</Text>
                      </View>
                    ))}
                  </View>
                )
              )}
            </View>
          )
        })()}

        {/* ── Narrative sections ── */}
        {data.workCompleted ? (
          <View style={s.section}>
            <Text style={s.sectionHeading}>Work Completed</Text>
            <Text style={s.sectionBody}>{data.workCompleted}</Text>
          </View>
        ) : null}

        {data.problems ? (
          <View style={s.section}>
            <Text style={s.sectionHeading}>Problems / Delays</Text>
            <Text style={s.sectionBody}>{data.problems}</Text>
          </View>
        ) : null}

        {data.nextSteps ? (
          <View style={s.section}>
            <Text style={s.sectionHeading}>Next Steps</Text>
            <Text style={s.sectionBody}>{data.nextSteps}</Text>
          </View>
        ) : null}

        {/* ── Photos ── */}
        {data.photoUrls.length > 0 ? (
          <View style={s.section}>
            <Text style={s.photoSectionHeading}>
              Site Photos ({data.photoUrls.length})
            </Text>
            {photoRows.map((row, ri) => (
              // wrap={false} prevents a row splitting across pages
              <View key={ri} style={s.photoRow} wrap={false}>
                {row.map((url, ci) => (
                  <View key={ci} style={row.length === 1 ? s.photoCellSingle : s.photoCell}>
                    <Image src={url} style={s.photoImg} />
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Fixed footer with page numbers ── */}
        <View style={s.pageFooter} fixed>
          <Text style={s.footerLeft}>Generated with SiteBrief</Text>
          <Text style={s.footerContact}>{footerCenter}</Text>
          <Text
            style={s.footerRight}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  )
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generates the PDF Blob. The caller pre-resolves all image data URLs
 * (photos + logo) before calling this function.
 */
export async function generateReportPdfBlob(data: ReportPdfData): Promise<Blob> {
  return pdf(<ReportDocument data={data} />).toBlob()
}

/**
 * Professional filename:  Company_ProjectName_Report-004_2026-09-26.pdf
 * Sanitizes to alphanumeric + underscore; caps at 60 chars before extension.
 */
export function reportPdfFilename(
  data: Pick<ReportPdfData, 'companyName' | 'projectName' | 'reportNumber' | 'createdAt'>,
): string {
  const sanitize = (s: string) => s.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  const date     = new Date(data.createdAt).toISOString().slice(0, 10)
  const company  = sanitize(data.companyName).slice(0, 20)
  const project  = sanitize(data.projectName).slice(0, 20)
  const num      = padReport(data.reportNumber)
  return `${company}_${project}_Report-${num}_${date}.pdf`
}
