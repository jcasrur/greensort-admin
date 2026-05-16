import React, { useState } from 'react';
import { useTheme } from './ThemeContext';

// Page-specific guide content
const GUIDES = {
  dashboard: {
    title: 'Dashboard Guide',
    sections: [
      {
        heading: 'Overview Cards',
        body: 'The three stat cards at the top show real-time counts from your database — Total Users, Active Drop-Off Centers, and the most scanned material type. These refresh each time you load the page.',
      },
      {
        heading: 'Collection Chart',
        body: 'Hover over the line chart to see daily waste collection totals in kg. Data is pulled from surrender logs. If no logs exist yet, sample data is shown as a placeholder.',
      },
      {
        heading: 'Material Breakdown',
        body: 'The donut chart shows the proportion of material types collected. This week\'s data is reflected — Plastic, Glass, and Paper are the primary categories tracked.',
      },
      {
        heading: 'Last Activity',
        body: 'Displays the two most recent system events such as database syncs and pending application notices. This is a summary view — detailed activity lives in each section.',
      },
    ],
  },
  users: {
    title: 'User Management Guide',
    sections: [
      {
        heading: 'Activity Status',
        body: 'Each user shows one of four states: Online (currently in the app via presence tracking), Offline (active recently but not right now), Inactive (30+ days since last login), or Deactivated (account blocked). Inactive rows are tinted orange so they stand out immediately.',
      },
      {
        heading: 'Filter Tabs',
        body: 'Use the tabs above the table to filter by status. The Inactive tab shows a badge count so you know at a glance how many users need attention. The search bar filters by name or email across the current tab.',
      },
      {
        heading: 'Notify Button',
        body: 'The "Notify" button appears only on Inactive rows. Clicking it opens a modal where you choose between an Inactivity Warning, a Final Notice (48h), or a Custom Message. The notification is delivered in-app — the user will see it the next time they open GreenSort. Once sent, the button flips to a green "Notified" state for the rest of your session.',
      },
      {
        heading: 'Deactivating a User',
        body: 'The power icon appears on Inactive rows. Deactivating sets the account status to Banned (the user can no longer log in) and sends them an in-app notification explaining why. This is reversible — click the checkmark icon on a Deactivated row to reactivate them and send a welcome-back notification.',
      },
      {
        heading: 'Deleting a User',
        body: 'Click the red trash icon to permanently delete a profile record. Unlike Deactivation, this cannot be undone. Use this only for confirmed spam accounts or at a user\'s explicit request.',
      },
      {
        heading: 'Inactivity Thresholds',
        body: 'The Inactive threshold is 30 days. This value is defined as a constant at the top of UserManagement.jsx and can be adjusted to match your platform\'s policy.',
      },
    ],
  },
  moderation: {
    title: 'Content Moderation Guide',
    sections: [
      {
        heading: 'All Posts',
        body: 'Browse every post in the community feed. You can delete any post directly using the trash icon at the bottom of the post card. Deletions are permanent.',
      },
      {
        heading: 'Reported Posts',
        body: 'Posts flagged by users appear here. Review the report reason, inspect the content, then choose to Approve (delete the post and notify the reporter) or Decline (keep the post, dismiss report).',
      },
      {
        heading: 'Reported Comments',
        body: 'View comments that have been reported. Inspect the quoted comment text, then delete it or dismiss the report. The comment author is not notified of the report.',
      },
      {
        heading: 'Reported Users',
        body: 'Accounts flagged by other users appear here. You can ban or warn the user, or dismiss the report if it appears unfounded. Ban logic should be implemented per your app\'s policy.',
      },
      {
        heading: 'Appeals',
        body: "When the AI auto-flags a user post, the user can submit an appeal from the mobile app. Each appeal card shows the original post title, the AI flag reason, and the user\'s own explanation. Choose Restore Post to make the post live again (the user gets an in-app notification), or Uphold Flag to keep it hidden (the user is also notified). If the original post was already permanently deleted, no action is available.",
      },
    ],
  },
  dropoff: {
    title: 'Drop-Off Nodes Guide',
    sections: [
      {
        heading: 'Requests Tab',
        body: 'Businesses and barangay organizations apply to become GreenSort drop-off centers. Each application shows their name, contact number, location, and how long they plan to operate.',
      },
      {
        heading: 'Approving an Application',
        body: 'Click the checkmark icon to approve. An automated email will be sent to the applicant\'s address using EmailJS. Make sure the applicant\'s email is valid before approving.',
      },
      {
        heading: 'Rejecting an Application',
        body: 'Click the X icon. You\'ll be prompted to enter a rejection reason, which is included in the notification email sent to the applicant.',
      },
      {
        heading: 'Active Nodes Tab',
        body: 'Lists all currently approved drop-off centers. You can deactivate a node (puts it on hold) or permanently delete it. Deactivated nodes can be reactivated later.',
      },
      {
        heading: 'Document Review',
        body: 'Applicants may attach a permit or business document URL. Click "View File" to open it in a new tab before making your decision.',
      },
      {
        heading: 'Managing Rewards',
        body: 'In the Active Nodes tab, each center has a green "Rewards" button. Click it to open the Rewards Inventory drawer for that center. You can add new reward items, edit existing ones, toggle availability (hides/shows the reward in the mobile app without deleting it), and delete rewards permanently. Each reward needs a Name and a Condition — the Condition field (e.g. "1kg Plastic") is what the mobile app parses to calculate how many rewards a user can claim.',
      },
    ],
  },
  surrender_logs: {
    title: 'Surrender Logs Guide',
    sections: [
      {
        heading: 'What is this page?',
        body: 'This is the full audit trail of every waste submission logged across the GreenSort network. Each row represents one transaction — a resident bringing recyclables to a drop-off center in exchange for a reward.',
      },
      {
        heading: 'Filters',
        body: 'Use the Search bar to find logs by resident name, resident email, or collector email. Filter by Waste Type (Plastic, Glass, Paper, etc.), Status (Completed/Pending/Cancelled), and Date Range. Active filters are highlighted and can be cleared all at once with the Clear Filters button.',
      },
      {
        heading: 'High-Weight Flags',
        body: 'Any log where the weight exceeds 50 kg is automatically flagged with a red "HIGH" badge and a red row highlight. These warrant manual review — a legitimate single transaction rarely exceeds 50 kg. The stat card in the header shows the total count of flagged entries.',
      },
      {
        heading: 'Deleting a Log',
        body: 'Click the trash icon on any row to open the delete confirmation modal. You must enter a reason before the deletion proceeds. The reason and all log details are written to the admin_activity_log table so there is always a record of why a log was removed — the deletion itself is permanent.',
      },
      {
        heading: 'Exporting to CSV',
        body: 'Click "Export CSV" in the header to download all currently filtered logs as a spreadsheet. The export respects your active filters — to export everything, clear all filters first.',
      },
      {
        heading: 'Pagination',
        body: 'The table shows 25 rows per page. Use the page controls at the bottom to navigate. The total result count updates live as you change filters.',
      },
    ],
  },
  access: {
    title: 'Admin Access Guide',
    sections: [
      {
        heading: 'Role Levels',
        body: 'There are two roles: Super Admin (full control — can manage all admins, view the allowlist, change roles) and Admin (standard access — can moderate content and manage users, but cannot promote to Super Admin).',
      },
      {
        heading: 'Inviting an Admin',
        body: 'Click "Invite Admin" and enter the person\'s email and name. Choose their role. An invitation email is sent via EmailJS. The invitee must use the link in the email to set up their account.',
      },
      {
        heading: 'Super Admin Allowlist',
        body: 'Only Super Admins can see this tab. Before you can invite or promote someone to Super Admin, their email must be added to this allowlist. This is enforced at the database level too.',
      },
      {
        heading: 'Deactivating an Admin',
        body: 'Click the power icon next to an admin\'s row to deactivate their account. They will not be able to log in until reactivated. You cannot deactivate your own account.',
      },
      {
        heading: 'Pending Invites',
        body: 'View all sent invitations that haven\'t been accepted yet. Invites expire after 48 hours. Super Admins can revoke an invite early if needed.',
      },
    ],
  },
};

export default function GuidePanel({ page }) {
  const { isLightMode, t } = useTheme();
  const [open, setOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const guide = GUIDES[page];
  if (!guide) return null;

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium shadow-lg transition-all duration-200 ${
          isLightMode
            ? 'bg-white border border-[#E6EBE4] text-[#3D7A58] hover:border-[#3D7A58]/40 hover:bg-[#F6F8F5]'
            : 'bg-[#1E2822] border border-white/[0.07] text-[#7DBF96] hover:border-[#5E9E7A]/30'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        How to use this page
      </button>

      {/* Panel overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

          {/* Panel */}
          <div
            className={`relative w-full sm:w-[400px] h-[85vh] sm:h-full sm:max-h-screen overflow-y-auto rounded-t-3xl sm:rounded-none border-t sm:border-l transition-colors ${
              isLightMode ? 'bg-white border-[#E6EBE4]' : 'bg-[#141A16] border-white/[0.06]'
            }`}
            onClick={e => e.stopPropagation()}
            style={{ scrollbarWidth: 'none' }}
          >
            {/* Header */}
            <div className={`sticky top-0 z-10 px-6 py-5 border-b ${t.divider} ${isLightMode ? 'bg-white' : 'bg-[#141A16]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${t.accentBg}`}>
                    <svg className={`w-4 h-4 ${t.accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-sm font-semibold ${t.textMain}`}>{guide.title}</h2>
                    <p className={`text-[10px] ${t.textMuted} mt-0.5`}>{guide.sections.length} topics</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className={`p-2 rounded-xl transition-all ${t.textMuted} hover:${t.textMain} ${isLightMode ? 'hover:bg-[#F3F6F1]' : 'hover:bg-white/[0.04]'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-2">
              {guide.sections.map((section, i) => (
                <div
                  key={i}
                  className={`rounded-xl border overflow-hidden transition-all ${
                    isLightMode ? 'border-[#E6EBE4]' : 'border-white/[0.05]'
                  }`}
                >
                  <button
                    onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-all ${
                      expandedIndex === i
                        ? (isLightMode ? 'bg-[#EAF4EE]' : 'bg-[#5E9E7A]/08')
                        : (isLightMode ? 'bg-white hover:bg-[#F6F8F5]' : 'bg-[#191F1C] hover:bg-white/[0.025]')
                    }`}
                  >
                    <span className={`text-sm font-medium ${expandedIndex === i ? t.accentText : t.textMain}`}>
                      {section.heading}
                    </span>
                    <svg
                      className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${t.textMuted} ${expandedIndex === i ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedIndex === i && (
                    <div className={`px-4 py-4 border-t ${t.divider} ${isLightMode ? 'bg-[#FAFCF9]' : 'bg-[#141A16]'}`}>
                      <p className={`text-sm leading-relaxed ${t.textSub}`}>{section.body}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Footer note */}
              <div className={`mt-4 p-4 rounded-xl ${isLightMode ? 'bg-[#F3F6F1]' : 'bg-white/[0.02]'}`}>
                <p className={`text-xs leading-relaxed ${t.textMuted}`}>
                  Need more help? Contact your Super Admin or refer to the GreenSort internal documentation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}