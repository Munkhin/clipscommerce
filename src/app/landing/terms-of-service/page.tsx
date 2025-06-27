import React from 'react';
import NavigationBar from '@/app/landing/components/NavigationBar';

export default function TermsOfServicePage() {
  return (
    <div className="bg-black min-h-screen text-white">
      <NavigationBar />
      
      <main className="max-w-4xl mx-auto px-6 py-24 text-base">
        <h1 className="text-4xl font-bold mb-4 text-[#8D5AFF]">ClipsCommerce Terms of Service</h1>
        <p className="mb-8 text-lg text-white/60">Effective Date: June 7, 2025</p>

        <section className="mb-8">
          <p className="text-white/90 leading-relaxed">Welcome to ClipsCommerce! These Terms of Service ("ToS") govern your use of the ClipsCommerce website and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these ToS. If you do not agree to these terms, please do not use the Service.</p>
        </section>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">1. Introduction</h2>
            <p className="text-white/90 leading-relaxed">These ToS outline the rules and responsibilities for using ClipsCommerce. They are designed to protect both you and ClipsCommerce, ensuring a safe and productive environment for all users. Please read them carefully before using the Service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">2. Definitions</h2>
            <ul className="space-y-2 text-white/90">
              <li><span className="font-semibold text-white">User:</span> Any individual or entity that accesses or uses the Service.</li>
              <li><span className="font-semibold text-white">Content:</span> Any videos, text, images, or other materials uploaded or shared by Users on the Platform.</li>
              <li><span className="font-semibold text-white">Service:</span> The ClipsCommerce website, tools, and features provided to Users.</li>
              <li><span className="font-semibold text-white">Platform:</span> The ClipsCommerce website and any associated applications or services.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">3. User Conduct</h2>
            <p className="text-white/90 mb-4">Users must not:</p>
            <ul className="space-y-2 text-white/90 list-disc pl-6">
              <li>Upload or share Content that is illegal, harmful, defamatory, or infringes on the rights of others.</li>
              <li>Engage in harassment, abuse, or any form of disruptive behavior.</li>
              <li>Attempt to disrupt, hack, or interfere with the Service or its security.</li>
              <li>Use the Service for any unauthorized commercial purpose.</li>
              <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
            </ul>
            <p className="mt-4 text-white/90">ClipsCommerce reserves the right to remove any Content or suspend any User who violates these rules.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">4. Content Ownership and Licensing</h2>
            <ul className="space-y-3 text-white/90">
              <li><span className="font-semibold text-white">Ownership:</span> You retain ownership of any Content you upload to the Platform.</li>
              <li><span className="font-semibold text-white">License:</span> By uploading Content, you grant ClipsCommerce a non-exclusive, worldwide, royalty-free license to use, display, and distribute your Content solely for the purpose of providing and improving the Service.</li>
              <li><span className="font-semibold text-white">Responsibility:</span> You are solely responsible for ensuring that your Content complies with applicable laws and does not infringe on the rights of others.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">5. Intellectual Property</h2>
            <ul className="space-y-3 text-white/90">
              <li><span className="font-semibold text-white">ClipsCommerce's Intellectual Property:</span> All trademarks, logos, designs, and other intellectual property associated with the Service are owned by ClipsCommerce or its licensors. You may not use, copy, or distribute any of these without prior written permission.</li>
              <li><span className="font-semibold text-white">User Responsibilities:</span> You agree not to infringe on ClipsCommerce's intellectual property rights or those of any third party while using the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">6. Service Limitations</h2>
            <ul className="space-y-3 text-white/90 list-disc pl-6">
              <li>The Service is provided "as is" and "as available." ClipsCommerce does not guarantee that the Service will be uninterrupted, error-free, or free from viruses or other harmful components.</li>
              <li>ClipsCommerce may modify, suspend, or discontinue any part of the Service at any time without notice.</li>
              <li>While ClipsCommerce strives to provide accurate and up-to-date information, we do not warrant the accuracy, completeness, or reliability of any Content or features on the Platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">7. Liability Disclaimers</h2>
            <p className="text-white/90 mb-4">ClipsCommerce shall not be liable for:</p>
            <ul className="space-y-2 text-white/90 list-disc pl-6">
              <li>Any indirect, incidental, consequential, or punitive damages arising from your use of the Service.</li>
              <li>Any loss of data, profits, or business opportunities.</li>
              <li>Any damages resulting from unauthorized access to or alteration of your Content or account.</li>
            </ul>
            <p className="mt-4 text-white/90">You agree that your use of the Service is at your own risk.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">8. User Responsibilities</h2>
            <ul className="space-y-3 text-white/90 list-disc pl-6">
              <li>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</li>
              <li>You agree to notify ClipsCommerce immediately of any unauthorized use of your account.</li>
              <li>You are responsible for ensuring that your Content and use of the Service comply with all applicable laws and regulations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">9. Indemnification</h2>
            <p className="text-white/90 mb-4">You agree to indemnify, defend, and hold harmless ClipsCommerce, its affiliates, and their respective officers, directors, employees, and agents from any claims, liabilities, damages, or expenses (including reasonable attorneys' fees) arising from:</p>
            <ul className="space-y-2 text-white/90 list-disc pl-6">
              <li>Your use of the Service.</li>
              <li>Your violation of these ToS.</li>
              <li>Your Content or any infringement of third-party rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">10. Termination</h2>
            <p className="text-white/90 mb-4">ClipsCommerce may terminate your access to the Service for:</p>
            <ul className="space-y-2 text-white/90 list-disc pl-6">
              <li>Violation of these ToS.</li>
              <li>Engaging in illegal or harmful activities.</li>
              <li>Prolonged inactivity.</li>
            </ul>
            <p className="mt-4 text-white/90">Upon termination, your right to use the Service will immediately cease, and ClipsCommerce may delete your Content without liability.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">11. Dispute Resolution</h2>
            <p className="text-white/90">Any disputes arising from or relating to these ToS or your use of the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. Arbitration shall take place in the United States, and the decision of the arbitrator shall be final and binding. You agree to waive any right to participate in a class action lawsuit or class-wide arbitration.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">12. Governing Law</h2>
            <p className="text-white/90">These ToS shall be governed by and construed in accordance with the laws of the United States of America, without regard to its conflict of law principles.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">13. Changes to the ToS</h2>
            <p className="text-white/90">ClipsCommerce reserves the right to modify these ToS at any time. Any changes will be effective immediately upon posting on the Platform. Your continued use of the Service after such changes constitutes your acceptance of the updated ToS. It is your responsibility to review the ToS periodically for any updates.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#8D5AFF]">14. Contact Information</h2>
            <p className="text-white/90">
              Email: <a href="mailto:hello@clipscommerce.com" className="text-[#5afcc0] hover:text-[#5afcc0]/80 transition-colors">hello@clipscommerce.com</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-white/60 text-sm">By using ClipsCommerce, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/40 text-sm">© 2024 ClipsCommerce. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
