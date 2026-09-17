
import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function DataDeletionPage() {
  useEffect(() => {
    document.title = "Data & Account Deletion | Forgot AI";
  }, []);

  return (
    <div className="flex-1 flex flex-col mx-auto max-w-5xl w-full text-ink">
      <div className="flex-1 mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Link to="/" className="text-sm text-ink-muted hover:text-ink mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="font-display text-4xl font-medium tracking-tight mb-4">Data & Account Deletion</h1>
        <p className="text-sm text-ink-muted mb-8">Last updated: September 17, 2026</p>
        
        <div className="prose prose-neutral max-w-none text-ink-muted">
          <p>You have full control over your data. If you wish to delete your memories or completely erase your account, follow the instructions below.</p>
          
          <h2 className="text-ink font-medium text-xl mt-8 mb-4">Deleting Individual Memories</h2>
          <p>You can delete individual memories directly within the Forgot AI web application. Locate the item you wish to delete, click the options menu, and select delete. Once deleted, the memory is permanently removed from our active database.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">Deleting Your Entire Account</h2>
          <p>To request the complete deletion of your account and all associated data, please contact our support team:</p>
          
          <div className="bg-neutral-50 p-4 rounded-lg border border-border mt-4 mb-4">
            <p className="mb-0">Email: <a href="mailto:jmohammadali5427@gmail.com" className="text-ink font-medium">jmohammadali5427@gmail.com</a></p>
            <p className="mt-2 mb-0">Subject: <strong>Account Deletion Request</strong></p>
          </div>

          <p>Please send the request from the email address associated with your Forgot AI account to verify your identity.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">What happens when you delete your account?</h2>
          <ul className="list-disc pl-5 space-y-2 mt-4">
            <li>Your authentication credentials and profile information are permanently removed.</li>
            <li>All your saved memories, links, texts, images, and AI-generated metadata are permanently purged from our active database.</li>
            <li>We do not retain "ghost" copies of your saved content after a deletion request is processed.</li>
          </ul>
        </div>
      </div>
      
    </div>
  );
}


