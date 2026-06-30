              {/* RENEWAL PENDING സീൽ */}
              {member.renewalPending === true && !isBanned && !isExpired && (
                <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] z-40 pointer-events-none select-none">
                  <div className="border-[4px] border-double border-red-600/90 p-2 px-3 rounded-xl flex flex-col items-center justify-center bg-white/10 backdrop-blur-[0.5px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] max-w-[220px]">
                    <span className="text-[12px] font-black tracking-[0.12em] text-red-600 font-sans uppercase">RENEWAL PENDING</span>
                    <div className="w-full h-[1.5px] bg-red-600/80 my-1" />
                    <span className="text-[11.5px] font-extrabold text-red-600 text-center font-sans">പുതുക്കൽ പരിശോധനയിൽ</span>
                  </div>
                </div>
              )}

              {/* പഴയ Pending Approval സീൽ (ഇത് കൂടി ഉണ്ടെങ്കിൽ മാത്രമേ സാധാരണ Pending മെമ്പർമാർക്ക് സീൽ കിട്ടൂ) */}
              {member.status === 'pending' && !member.renewalPending && !isBanned && !isExpired && (
                <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] z-40 pointer-events-none select-none">
                  <div className="border-[4px] border-double border-rose-600/80 p-2 px-3 rounded-xl flex flex-col items-center justify-center bg-white/10 backdrop-blur-[0.5px] shadow-[0_4px_12px_rgba(0,0,0,0.2)] max-w-[220px]">
                    <span className="text-[12px] font-black tracking-[0.12em] text-rose-600 font-sans uppercase">PENDING APPROVAL</span>
                    <div className="w-full h-[1.5px] bg-rose-600/80 my-1" />
                    <span className="text-[11.5px] font-extrabold text-rose-600 text-center font-sans">അപ്പ്രൂവൽ പെൻഡിങ്</span>
                  </div>
                </div>
              )}
