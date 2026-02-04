"use client";

import React, { Fragment, useEffect, useRef, useState, ChangeEvent } from "react";
import dynamic from "next/dynamic";
import Seo from "@/shared/layout-components/seo/seo";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import { Countryoptions, Languageoptions } from "@/shared/data/pages/mail/mailsettingdata";
import { useAuth } from "@/shared/contexts/auth-context";

const Select = dynamic(() => import("react-select"), { ssr: false });

export default function PersonalInformationPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>("../../../assets/images/faces/9.jpg");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const openFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  useEffect(() => {
    if (!user) return;
    const fullName = user.name ?? "";
    if (fullName) {
      const [first, ...rest] = fullName.split(" ");
      setFirstName(first ?? "");
      setLastName(rest.join(" "));
    } else {
      setFirstName("");
      setLastName("");
    }
    const emailVal = user.email ?? "";
    setEmail(emailVal);
    setUserName(emailVal);
  }, [user]);

  return (
    <Fragment>
      <Seo title="Personal Information" />
      <div className="sm:p-4 p-4">
        <h6 className="font-semibold mb-4 text-[1rem]">Photo :</h6>
        <div className="mb-6 sm:flex items-center">
          <div className="mb-0 me-[3rem]">
            <span className="avatar avatar-xxl avatar-rounded">
              <img src={selectedImage || ""} alt="" id="profile-img" />
              <span
                aria-label="anchor"
                className="badge rounded-full bg-primary avatar-badge"
                onClick={openFileInput}
              >
                <input
                  type="file"
                  name="photo"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                  className="absolute w-full h-full opacity-0"
                  id="profile-image"
                />
                <i className="fe fe-camera !text-[0.65rem] !text-white"></i>
              </span>
            </span>
          </div>
          <div className="inline-flex">
            <button type="button" className="ti-btn bg-primary text-white !rounded-e-none !font-medium">
              Change
            </button>
            <button type="button" className="ti-btn ti-btn-light !font-medium !rounded-s-none">
              Remove
            </button>
          </div>
        </div>

        <h6 className="font-semibold mb-4 text-[1rem]">Profile :</h6>
        <div className="sm:grid grid-cols-12 gap-6 mb-6">
          <div className="xl:col-span-6 col-span-12">
            <label htmlFor="first-name" className="form-label">
              First Name
            </label>
            <input
              type="text"
              className="form-control w-full !rounded-md"
              id="first-name"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="xl:col-span-6 col-span-12">
            <label htmlFor="last-name" className="form-label">
              Last Name
            </label>
            <input
              type="text"
              className="form-control w-full !rounded-md"
              id="last-name"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="xl:col-span-12 col-span-12">
            <label className="form-label">User Name</label>
            <div className="input-group !flex-nowrap mb-3">
              <span className="input-group-text" id="basic-addon3">
                {user?.email ?? "—"}
              </span>
              <input
                type="text"
                className="form-control w-full rounded-md"
                id="basic-url"
                aria-describedby="basic-addon3"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
          </div>
        </div>

        <h6 className="font-semibold mb-4 text-[1rem]">Personal information :</h6>
        <div className="sm:grid grid-cols-12 gap-6 mb-6">
          <div className="xl:col-span-6 col-span-12">
            <label htmlFor="email-address" className="form-label">
              Email Address :
            </label>
            <input
              type="email"
              className="form-control w-full !rounded-md"
              id="email-address"
              placeholder="xyz@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="xl:col-span-6 col-span-12">
            <label htmlFor="Contact-Details" className="form-label">
              Contact Details :
            </label>
            <input
              type="text"
              className="form-control w-full !rounded-md"
              id="Contact-Details"
              placeholder="contact details"
            />
          </div>
          <div className="xl:col-span-6 col-span-12">
            <label className="form-label">Language :</label>
            <Select
              isMulti
              name="colors"
              options={Languageoptions}
              className=""
              menuPlacement="auto"
              classNamePrefix="Select2"
              defaultValue={[Languageoptions[0]]}
            />
          </div>
          <div className="xl:col-span-6 col-span-12">
            <label className="form-label">Country :</label>
            <Select
              name="colors"
              options={Countryoptions}
              className="w-full !rounded-md"
              menuPlacement="auto"
              classNamePrefix="Select2"
              defaultValue={Countryoptions[0]}
            />
          </div>
          <div className="xl:col-span-12 col-span-12">
            <label htmlFor="bio" className="form-label">
              Bio :
            </label>
            <textarea
              className="form-control w-full !rounded-md dark:!text-defaulttextcolor/70"
              id="bio"
              rows={5}
              defaultValue="Lorem ipsum dolor sit amet consectetur adipisicing elit. At sit impedit, officiis non minima saepe voluptates a magnam enim sequi porro veniam ea suscipit dolorum vel mollitia voluptate iste nemo!"
            />
          </div>
        </div>
        {/* <button type="button" className="ti-btn bg-primary text-white m-1">
          Save
        </button> */}
      </div>
    </Fragment>
  );
}
