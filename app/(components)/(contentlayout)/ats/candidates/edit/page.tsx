"use client";

import { Basicwizard } from "@/shared/data/pages/candidates/candidateform";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCandidate } from "@/shared/lib/api/candidates";

const EditCandidate = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [initialData, setInitialData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const data = await getCandidate(id);
        setInitialData(data);
      } catch {
        setInitialData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <Fragment>
      <Seo title="Edit Candidate" />
      <Pageheader
        currentpage="Edit Candidate"
        activepage="Candidates"
        mainpage="Edit Candidate"
      />
      <div className="container">
        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="box overflow-hidden">
              <div className="box-body !p-0 product-checkout">
                {loading ? (
                  <div className="p-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                  </div>
                ) : initialData ? (
                  <Basicwizard initialData={initialData} />
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    {id ? "Candidate not found." : "No candidate selected."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default EditCandidate;
