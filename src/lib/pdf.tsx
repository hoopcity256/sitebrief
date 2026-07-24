/**
 * PDF generation for SiteBrief daily reports.
 * Uses @react-pdf/renderer — runs entirely in the browser.
 * Returns a Blob suitable for download or Web Share.
 *
 * No business logic lives here — all data is passed in by the caller.
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

// ── Colour tokens mirrored from index.css ──────────────────────────────────
const NAVY  = '#1A5276'
const GREY  = '#6B7280'
const LIGHT = '#F3F4F6'
const BORDER = '#E5E7EB'
const BLACK = '#111827'

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: BLACK,
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 44,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
  },
  brandName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
  brandTagline: {
    fontSize: 8,
    color: GREY,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  reportTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
  reportMeta: {
    fontSize: 8,
    color: GREY,
    marginTop: 3,
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    backgroundColor: LIGHT,
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
    gap: 24,
  },
  infoCell: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    color: BLACK,
  },

  // Section
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sectionText: {
    fontSize: 10,
    color: BLACK,
    lineHeight: 1.55,
  },

  // Photos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  photo: {
    width: 120,
    height: 90,
    objectFit: 'cover',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: BORDER,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: GREY,
  },
  badge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    backgroundColor: NAVY,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
})

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReportPdfData {
  reportNumber: number
  isDraft: boolean
  createdAt: string
  companyName: string
  projectName: string
  customerName?: string | null
  address?: string | null
  workCompleted?: string | null
  problems?: string | null
  nextSteps?: string | null
  /** Signed image URLs — will be embedded in the PDF */
  photoUrls: string[]
}

// ── Document ───────────────────────────────────────────────────────────────

const ReportDocument = ({ data }: { data: ReportPdfData }) => {
  const dateStr = new Date(data.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <Document
      title={`${data.companyName} — Report #${data.reportNumber}`}
      author={data.companyName}
      subject="Daily Report"
      creator="SiteBrief"
    >
      <Page size="LETTER" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>SiteBrief</Text>
            <Text style={s.brandTagline}>Daily Report</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.reportTitle}>Report #{data.reportNumber}</Text>
            <Text style={s.reportMeta}>{dateStr}</Text>
            {data.isDraft && <Text style={s.reportMeta}>⚠ DRAFT</Text>}
          </View>
        </View>

        {/* ── Project info row ── */}
        <View style={s.infoRow}>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Company</Text>
            <Text style={s.infoValue}>{data.companyName}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Project</Text>
            <Text style={s.infoValue}>{data.projectName}</Text>
          </View>
          {data.customerName ? (
            <View style={s.infoCell}>
              <Text style={s.infoLabel}>Customer</Text>
              <Text style={s.infoValue}>{data.customerName}</Text>
            </View>
          ) : null}
          {data.address ? (
            <View style={s.infoCell}>
              <Text style={s.infoLabel}>Address</Text>
              <Text style={s.infoValue}>{data.address}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Work Completed ── */}
        {data.workCompleted ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Work Completed</Text>
            <Text style={s.sectionText}>{data.workCompleted}</Text>
          </View>
        ) : null}

        {/* ── Problems ── */}
        {data.problems ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Problems / Delays</Text>
            <Text style={s.sectionText}>{data.problems}</Text>
          </View>
        ) : null}

        {/* ── Next Steps ── */}
        {data.nextSteps ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Next Steps</Text>
            <Text style={s.sectionText}>{data.nextSteps}</Text>
          </View>
        ) : null}

        {/* ── Photos ── */}
        {data.photoUrls.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Site Photos ({data.photoUrls.length})</Text>
            <View style={s.photoGrid}>
              {data.photoUrls.map((url, i) => (
                <Image key={i} src={url} style={s.photo} />
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Generated by SiteBrief · {data.companyName}
          </Text>
          <Text style={s.badge}>
            {data.isDraft ? 'DRAFT' : 'FINAL'}
          </Text>
        </View>

      </Page>
    </Document>
  )
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generates the PDF and returns a Blob.
 * The caller is responsible for download/share.
 */
export async function generateReportPdfBlob(data: ReportPdfData): Promise<Blob> {
  const blob = await pdf(<ReportDocument data={data} />).toBlob()
  return blob
}

/** Suggested filename for download or share. */
export function reportPdfFilename(data: Pick<ReportPdfData, 'companyName' | 'reportNumber' | 'createdAt'>): string {
  const date = new Date(data.createdAt).toISOString().slice(0, 10)
  const company = data.companyName.replace(/[^a-z0-9]/gi, '_').slice(0, 30)
  return `SiteBrief_${company}_Report${data.reportNumber}_${date}.pdf`
}
