/**
 * useCompanyProfile — re-exports from the shared CompanyProfileContext.
 *
 * Preserved for backwards compatibility: all call sites (AuthGuard,
 * OnboardingPage, ReportPreviewPage, etc.) continue to call
 * useCompanyProfile() without modification.
 *
 * The underlying state is now shared across ALL consumers via
 * CompanyProfileContext — fixing the bug where OnboardingPage's setProfile()
 * call had no effect on AuthGuard's independent hook instance.
 */
export { useCompanyProfile } from '../context/CompanyProfileContext'
