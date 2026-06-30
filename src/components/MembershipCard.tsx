export default function MembershipCard({ member, onUpdatePhoto, showCelebration = true, isAdmin = false, onLogout }: MembershipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);

  useEffect(() => {
    getOrgSettings().then(setSettings);
  }, []);

  const districtName = DISTRICTS.find(d => d.code === member.district)?.name || member.district;

  // നിലവിലെ ഡിസൈനിലെ പ്രധാന ലോജിക്
  const isExpired = member.role !== 'admin' && member.role !== 'operator' && !member.isAdmin && member.status !== 'pending' && !member.renewalPending;
  const isPending = member.status === 'pending' || member.renewalPending;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div ref={cardRef} className="w-[340px] h-[590px] rounded-[24px] bg-slate-900 border-[6px] border-slate-700 relative flex flex-col justify-between overflow-hidden shadow-2xl">
        
        {/* ഇവിടെയാണ് സീൽ വരുന്നത് */}
        {isPending && !isExpired && (
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] z-50 pointer-events-none select-none">
            <div className="border-[4px] border-double border-red-600 bg-white/90 p-4 rounded-xl shadow-xl text-center">
              <div className="text-red-600 font-black text-lg uppercase">
                {member.renewalPending ? 'RENEWAL PENDING' : 'PENDING APPROVAL'}
              </div>
        
        )}

        <div className="p-6 text-white text-center">
           <h3 className="text-2xl font-black">{member.name}</h3>
           <p className="text-sm text-gray-400">{member.membershipId}</p>
        </div>
      </div>
      
      <Button onClick={() => window.print()} className="w-full bg-blue-600">Download Card</Button>
    </div>
  );
