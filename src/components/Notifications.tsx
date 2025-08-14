import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { mockPhoneReports } from '../services/mockData';
import { Megaphone, CheckCircle, AlertCircle, AlertTriangle, Search, ChevronUp, ChevronDown, Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

const Notifications: React.FC = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReportPasswordDialog, setShowReportPasswordDialog] = useState(false);
  const [reportPassword, setReportPassword] = useState('');
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [statusChangePassword, setStatusChangePassword] = useState('');

  useEffect(() => {
    // جلب البلاغات من Supabase للمستخدم الحالي فقط والتي حالتها active
    const fetchReports = async () => {
      try {
        if (!user?.id) {
          setReports([]);
          return;
        }
        const { data, error } = await supabase
          .from('phone_reports')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('report_date', { ascending: false });
        if (error) throw error;
        // إزالة التكرار حسب رقم الإيمي
        const uniqueReports = data ? data.filter((report, idx, arr) =>
          arr.findIndex(r => r.imei === report.imei) === idx
        ) : [];
        setReports(uniqueReports);
      } catch (error) {
        console.error('Error loading reports from Supabase:', error);
        setReports([]);
      }
    };
    fetchReports();
  }, [user]);

  useEffect(() => {
    const close = () => setShowNotifications(false);
    window.addEventListener('closeNotifications', close);
    return () => window.removeEventListener('closeNotifications', close);
  }, []);

  const filteredReports = reports.filter(report => {
    const searchLower = searchQuery.toLowerCase();
    return (
      report.imei.toLowerCase().includes(searchLower) ||
      report.ownerName.toLowerCase().includes(searchLower) ||
      report.phoneNumber.includes(searchQuery)
    );
  });

  const activeReports = filteredReports.filter(report => report.status === 'active');
  const resolvedReports = filteredReports.filter(report => report.status === 'resolved');

  const handleReportClick = (report: any) => {
    if (report.status === 'active') {
      setSelectedReport(report);
      setShowReportPasswordDialog(true);
      setShowNotifications(false);
    } else {
      navigateToReport(report);
    }
  };

  const navigateToReport = (report: any) => {
    setShowNotifications(false);
    window.location.href = `/phone/${report.id}`;
  };

  const handleStatusChange = () => {
    // Update report status
    const updatedReports = reports.map(report => {
      if (report.id === selectedReport.id) {
        return { 
          ...report, 
          status: report.status === 'active' ? 'resolved' : 'active' 
        };
      }
      return report;
    });

    // Update localStorage
    const savedReports = updatedReports.filter(report => !mockPhoneReports.some(mock => mock.id === report.id));
    localStorage.setItem('phoneReports', JSON.stringify(savedReports));

    // Update state
    setReports(updatedReports);
    setShowStatusDialog(false);
    setSelectedReport(null);

    toast({
      title: t('success'),
      description: t('status_changed_success'),
    });
  };

  // تحديث حالة البلاغ في Supabase عند إدخال الباسورد
  const verifyReportPassword = async () => {
    if (reportPassword === selectedReport?.password) {
      try {
        // طباعة لمراقبة القيم
        console.log('Trying to update report status:', selectedReport?.id, selectedReport);
        // تحديث حالة البلاغ في Supabase
        const { data, error } = await supabase
          .from('phone_reports')
          .update({ status: 'resolved' })
          .eq('id', selectedReport.id)
          .select();
        console.log('Supabase update result:', data, error);
        if (error) throw error;

        // إعادة جلب البلاغات
        const { data: refreshed, error: fetchError } = await supabase
          .from('phone_reports')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('report_date', { ascending: false });
        if (fetchError) throw fetchError;
        const uniqueReports = refreshed ? refreshed.filter((report, idx, arr) =>
          arr.findIndex(r => r.imei === report.imei) === idx
        ) : [];
        setReports(uniqueReports);

        setShowReportPasswordDialog(false);
        setReportPassword('');
        setSelectedReport(null);
        setShowNotifications(false);
        toast({
          title: t('success'),
          description: t('phone_found_message'),
          className: "z-[10001]"
        });
      } catch (error) {
        console.error("Error updating report status in Supabase:", error);
        toast({
          title: t('error'),
          description: t('error_updating_status'),
          variant: 'destructive',
          className: "z-[10001]"
        });
      }
    } else {
      toast({
        title: t('error'),
        description: t('invalid_report_password'),
        variant: 'destructive',
        className: "z-[10001]"
      });
    }
  };

  const verifyPassword = () => {
    if (password === '123456') {
      // Update report status
      const updatedReports = reports.map(report => {
        if (report.id === selectedReport.id) {
          return { ...report, status: 'resolved' };
        }
        return report;
      });

      // Update localStorage
      const savedReports = updatedReports.filter(report => !mockPhoneReports.some(mock => mock.id === report.id));
      localStorage.setItem('phoneReports', JSON.stringify(savedReports));

      // Update state
      setReports(updatedReports);
      setPassword('');
      setShowPasswordDialog(false);
      setSelectedReport(null);

      toast({
        title: t('success'),
        description: t('status_changed_success'),
        className: "z-[10001]"
      });
    } else {
      toast({
        title: t('error'),
        description: t('invalid_password'),
        variant: 'destructive',
        className: "z-[10001]"
      });
    }
  };

  const loadReports = () => {
    try {
      const savedReportsStr = localStorage.getItem('phoneReports') || '[]';
      const savedReports = JSON.parse(savedReportsStr);
      
      // Combine mock and saved reports, ensuring we use the latest version of each report
      const allReports = [...mockPhoneReports, ...savedReports].reduce((acc, report) => {
        const existingIndex = acc.findIndex(r => r.id === report.id);
        if (existingIndex === -1) {
          acc.push(report);
        } else {
          // If report exists, use the latest version (from localStorage)
          acc[existingIndex] = report;
        }
        return acc;
      }, []);

      // Sort reports by date (newest first)
      const sortedReports = allReports.sort((a, b) => 
        new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
      );
      
      setReports(sortedReports);
    } catch (error) {
      console.error("Error loading reports:", error);
      setReports(mockPhoneReports);
    }
  };

  const handleStatusChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleStatusChange();
    setShowStatusChangeModal(false);
    setStatusChangePassword('');
  };

  return (
    <div className="relative flex items-center gap-3 justify-center align-middle" style={{ minHeight: 40 }}>
      {/* Crown icon for ownership transfer */}
      <span
        title="نقل ملكية"
        className="cursor-pointer flex items-center justify-center"
        style={{ minWidth: 28 }}
        onClick={() => {
          if (user?.role === 'business') {
            navigate('/businesstransfer');
          } else {
            navigate('/ownership-transfer');
          }
        }}
      >
        <Crown size={22} className="text-yellow-400 hover:text-yellow-500 transition-colors" />
      </span>
      {/* Notifications Megaphone */}
      <button
        onClick={() => {
          setShowNotifications(!showNotifications);
          window.dispatchEvent(new Event('closeMenu'));
        }}
        className="relative p-2 text-imei-cyan hover:text-white transition-colors flex items-center justify-center"
        style={{ minWidth: 36 }}
        aria-label="الإشعارات"
      >
        <Megaphone size={22} style={{ verticalAlign: 'middle' }} />
        {activeReports.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeReports.length}
          </span>
        )}
      </button>

      {showNotifications && (
        <div
          className={
            `fixed w-80 bg-imei-darker rounded-lg shadow-lg border border-imei-cyan border-opacity-30 z-[9999]`
          }
          style={{
            top: 110,
            [language === 'ar' ? 'left' : 'right']: 24
          }}
        >
          <div className="p-4">
            <h3 className="text-white text-lg font-semibold mb-3">
              {t('my_reports')}
            </h3>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                type="text"
                placeholder={t('search_reports')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-imei-dark border-imei-cyan text-white"
              />
            </div>
            
            <ScrollArea className="h-[400px] pr-4">
              {activeReports.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-imei-cyan text-sm font-medium mb-2 flex items-center">
                    <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                    {t('active_reports')}
                  </h4>
                  <div className="space-y-2">
                    {activeReports.map(report => (
                      <button
                        key={report.id}
                        onClick={() => handleReportClick(report)}
                        className="w-full text-left p-3 rounded-lg hover:bg-imei-dark transition-colors border border-imei-cyan/20"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">{report.imei}</span>
                          <ChevronDown className="h-4 w-4 text-imei-cyan" />
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          {report.report_date ? new Date(report.report_date).toLocaleString('ar-EG') : '-'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {resolvedReports.length > 0 && (
                <div>
                  <h4 className="text-imei-cyan text-sm font-medium mb-2 flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    {t('resolved_reports')}
                  </h4>
                  <div className="space-y-2">
                    {resolvedReports.map(report => (
                      <button
                        key={report.id}
                        onClick={() => navigateToReport(report)}
                        className="w-full text-left p-3 rounded-lg hover:bg-imei-dark transition-colors border border-imei-cyan/20"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">{report.imei}</span>
                          <ChevronUp className="h-4 w-4 text-imei-cyan" />
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          {report.report_date ? new Date(report.report_date).toLocaleString('ar-EG') : '-'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredReports.length === 0 && (
                <div className="text-gray-400 text-sm text-center py-4">
                  {t('no_reports_found')}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Modal لتغيير حالة البلاغ */}
      {showStatusChangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-imei-darker rounded-lg p-6 max-w-md w-full">
            <h2 className="text-white text-xl font-bold mb-4">
              {t('change_report_status')}
            </h2>
            <form onSubmit={handleStatusChangeSubmit} className="space-y-4">
              <div>
                <label htmlFor="statusChangePassword" className="block text-white text-sm font-medium mb-1">
                  {t('password')}
                </label>
                <input
                  type="password"
                  id="statusChangePassword"
                  value={statusChangePassword}
                  onChange={(e) => setStatusChangePassword(e.target.value)}
                  className="input-field w-full"
                  required
                />
                <p className="text-sm text-gray-400 mt-1">
                  {t('password_warning')}
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusChangeModal(false);
                    setStatusChangePassword('');
                  }}
                  className="px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-imei-cyan rounded-lg hover:bg-imei-cyan-dark"
                >
                  {t('confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Password Dialog */}
      <Dialog open={showReportPasswordDialog} onOpenChange={setShowReportPasswordDialog}>
        <DialogContent className="bg-imei-darker border border-imei-cyan z-[10000]">
          <DialogHeader>
            <DialogTitle className="text-white">{t('enter_report_password')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('enter_password_to_view_report')}
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('status_change_warning')}
            </AlertDescription>
          </Alert>
          <Input
            type="password"
            value={reportPassword}
            onChange={(e) => setReportPassword(e.target.value)}
            placeholder={t('report_password')}
            className="bg-imei-dark border-imei-cyan text-white"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportPasswordDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={verifyReportPassword}>
              {t('verify')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Verification Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-imei-darker border border-imei-cyan">
          <DialogHeader>
            <DialogTitle className="text-white">{t('verify_password')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('enter_password_to_confirm')}
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('password')}
            className="bg-imei-dark border-imei-cyan text-white"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={verifyPassword}>
              {t('verify')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notifications;