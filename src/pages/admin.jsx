import { useEffect, useState } from "react";
import { Tabs } from "../components/tabs";
import { OverviewTab } from "../components/admin/overviewTab";
import { DeliveriesTab } from "../components/admin/deliveriesTab";
import { CouriersTab } from "../components/admin/couriersTab";

export const Admin = () => {  
    const [tab, setTab] = useState("Overview");

  return (
    <section>
      <h2>Admin Dashboard</h2>
      <Tabs
        tabs={["Overview", "Deliveries", "Couriers"]}
        current={tab}
        onChange={setTab}
      />
      {tab === "Overview" && <OverviewTab />}
      {tab === "Deliveries" && <DeliveriesTab />}
      {tab === "Couriers" && <CouriersTab />}
    </section>
  );
};

export default Admin;
