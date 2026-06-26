import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../contexts/CourseContext';
import { useRef, useState } from 'react';
import domtoimage from 'dom-to-image';
import { jsPDF } from 'jspdf';
import { Download, ArrowLeft, Award } from 'lucide-react';

export function Certificate() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const { courses } = useCourses();
  const course = courses.find((c) => c.id === courseId);
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  if (!course || !user) {
    return (
      <div className="flex-col min-h-[calc(100vh-4rem)] flex items-center justify-center p-8 bg-black">
        <h2 className="text-2xl font-bold text-white mb-4">Certificate not found</h2>
        <Link to="/app/my-courses" className="text-blue-400 hover:underline">
          Return to My Courses
        </Link>
      </div>
    );
  }

  const downloadCertificate = async () => {
    if (!certRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await domtoimage.toPng(certRef.current, {
        quality: 1,
        bgcolor: '#0a0a0c',
        width: certRef.current.offsetWidth * 2,
        height: certRef.current.offsetHeight * 2,
        style: {
          transform: 'scale(2)',
          transformOrigin: 'top left'
        }
      });
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [certRef.current.offsetWidth * 2, certRef.current.offsetHeight * 2]
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, certRef.current.offsetWidth * 2, certRef.current.offsetHeight * 2);
      pdf.save(`${course.title.replace(/\s+/g, '_')}_Certificate.pdf`);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF: ' + (err.message || String(err)));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-5xl mb-8 flex justify-between items-center">
        <Link to="/app/my-courses" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={20} /> Back to My Courses
        </Link>
        <button
          onClick={downloadCertificate}
          disabled={downloading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
        >
          {downloading ? 'Generating PDF...' : 'Download PDF'} <Download size={18} />
        </button>
      </div>

      {/* Certificate Preview */}
      <div className="overflow-x-auto w-full flex justify-center pb-8 custom-scrollbar">
        <div 
          ref={certRef} 
          className="w-[1000px] h-[707px] relative rounded-lg flex flex-col items-center justify-center p-16 text-center shrink-0 overflow-hidden"
          style={{ backgroundColor: '#0a0a0c', border: '16px solid rgba(255,255,255,0.05)' }}
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
          <div className="absolute -top-64 -left-64 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0) 70%)' }} />
          <div className="absolute -bottom-64 -right-64 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0) 70%)' }} />
          
          <Award size={80} style={{ color: '#3b82f6', marginBottom: '2rem' }} />
          
          <h1 className="text-5xl font-serif tracking-widest uppercase mb-4" style={{ color: '#ffffff' }}>Certificate of Completion</h1>
          <p className="text-xl tracking-widest uppercase mb-12" style={{ color: 'rgba(255,255,255,0.5)' }}>This is to certify that</p>
          
          <h2 className="text-6xl font-bold mb-12 font-serif capitalize" style={{ color: '#ffffff' }}>{user.user_metadata?.full_name || user.email?.split('@')[0]}</h2>
          
          <p className="text-xl mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>has successfully completed the course</p>
          <h3 className="text-3xl font-medium mb-16 max-w-3xl leading-snug" style={{ color: '#ffffff' }}>{course.title}</h3>
          
          <div className="flex w-full justify-between items-end mt-auto px-16">
            <div className="text-center">
              <div className="w-48 mb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }} />
              <p className="text-sm uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Date</p>
              <p className="mt-1" style={{ color: '#ffffff' }}>{new Date().toLocaleDateString()}</p>
            </div>
            
            <div className="text-center">
              <div className="w-48 mb-3 flex flex-col items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <span className="font-serif italic text-3xl -mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>{course.instructor}</span>
              </div>
              <p className="text-sm uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Course Instructor</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
