import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

vi.mock("@/shared/contexts/auth-context", () => ({
  useAuth: () => ({ user: null, permissions: [] }),
}));
// true so the company-email block renders and its read-only state can be asserted
vi.mock("@/shared/lib/permissions", () => ({ hasPermission: () => true }));

const uploadDocument = vi.fn();
vi.mock("@/shared/lib/api/employees", () => ({
  uploadDocument: (...args: unknown[]) => uploadDocument(...args),
}));

const renderCropMock = vi.fn();
vi.mock("@/shared/lib/image/cropImage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/image/cropImage")>();
  return {
    ...actual,
    renderCrop: (...args: unknown[]) => renderCropMock(...args),
  };
});

vi.mock("react-easy-crop", () => ({
  default: function MockCropper({
    onCropComplete,
  }: {
    onCropComplete?: (area: unknown, pixels: { x: number; y: number; width: number; height: number }) => void;
  }) {
    React.useEffect(() => {
      onCropComplete?.(
        { x: 0, y: 0, width: 50, height: 50 },
        { x: 0, y: 0, width: 100, height: 100 },
      );
    }, [onCropComplete]);
    return <div data-testid="mock-cropper" />;
  },
}));

import { WizardProvider, type WizardContextValue } from "../engine/WizardContext";
import { PersonalInfoStep } from "../steps/PersonalInfoStep";
import { useWorkforceStore } from "../state/workforce.store";
import { toSelfServicePayload } from "../services/payload";
import { normalize } from "../services/normalizer";
import { makeFormState } from "./fixtures";
import type { StepConfig } from "../types/wizard.types";

const STEPS: StepConfig[] = [
  {
    id: "personal-info",
    title: "Personal Info",
    icon: "ri-user-3-line",
    visibleIn: ["self-service-employee"],
  },
];

function ctx(): WizardContextValue {
  return {
    mode: "self-service-employee",
    role: "employee",
    steps: STEPS,
    currentStep: "personal-info",
    currentIndex: 0,
    setStepById: vi.fn(),
    setStepByIndex: vi.fn(),
    isLoading: false,
    isSaving: false,
    loadError: null,
    saveError: null,
    isDirty: false,
    dirtySections: {},
    resetDirty: vi.fn(),
    clearSaveError: vi.fn(),
    issues: [],
    issuesByField: {},
    issuesBySection: {},
    submitAttempted: false,
    submit: vi.fn(),
  } as WizardContextValue;
}

const renderStep = () =>
  render(
    <WizardProvider value={ctx()}>
      <PersonalInfoStep />
    </WizardProvider>,
  );

const pickFile = (name = "me.png", type = "image/png", size = 10) => {
  const input = screen.getByLabelText("Upload profile picture") as HTMLInputElement;
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
};

beforeEach(() => {
  uploadDocument.mockReset();
  renderCropMock.mockReset();
  renderCropMock.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
  useWorkforceStore.getState().hydrate(makeFormState());
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
});
afterEach(cleanup);

describe("profile picture — wizard save path", () => {
  it("opens the crop editor on file pick without uploading", () => {
    renderStep();
    pickFile();
    expect(screen.getByRole("dialog", { name: "Edit profile photo" })).toBeInTheDocument();
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("shows a blob preview immediately after Apply while upload is in progress", async () => {
    let resolveUpload!: (value: unknown) => void;
    uploadDocument.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    renderStep();
    pickFile();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      const img = screen.getByRole("img", { name: "Your profile photo" }) as HTMLImageElement;
      expect(img.src).toContain("blob:preview");
    });
    expect(uploadDocument).toHaveBeenCalledTimes(1);
    expect(useWorkforceStore.getState().personalInfo.profilePicture).toBeUndefined();

    resolveUpload({
      url: "https://cdn.example.com/me.jpg",
      key: "uploads/me.jpg",
      originalName: "me.jpg",
      size: 10,
      mimeType: "image/jpeg",
    });

    await waitFor(() => {
      const pi = useWorkforceStore.getState().personalInfo;
      expect(pi.profilePicture?.url).toBe("https://cdn.example.com/me.jpg");
    });
  });

  it("uploads the cropped file after Apply and stores returned metadata", async () => {
    uploadDocument.mockResolvedValue({
      url: "https://cdn.example.com/me.jpg",
      key: "uploads/me.jpg",
      originalName: "me.jpg",
      size: 10,
      mimeType: "image/jpeg",
    });
    renderStep();
    pickFile();

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(renderCropMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(uploadDocument).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const pi = useWorkforceStore.getState().personalInfo;
      expect(pi.profilePicture?.url).toBe("https://cdn.example.com/me.jpg");
      expect(pi.profilePicture?.key).toBe("uploads/me.jpg");
      expect(pi.profilePictureFile).toBeFalsy();
    });
    const uploaded = uploadDocument.mock.calls[0][0] as File;
    expect(uploaded.name).toBe("me.jpg");
    expect(uploaded.type).toBe("image/jpeg");
  });

  it("shows a loading overlay while the cropped photo uploads", async () => {
    let resolveUpload!: (value: unknown) => void;
    uploadDocument.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    renderStep();
    pickFile();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Your profile photo" }).parentElement?.querySelector(".ri-loader-4-line")).toBeTruthy();
    });

    resolveUpload({
      url: "https://cdn.example.com/me.jpg",
      key: "uploads/me.jpg",
      originalName: "me.jpg",
      size: 10,
      mimeType: "image/jpeg",
    });

    await waitFor(() => {
      expect(useWorkforceStore.getState().personalInfo.profilePicture?.url).toBe(
        "https://cdn.example.com/me.jpg",
      );
    });
  });

  it("does not upload when crop is cancelled", async () => {
    renderStep();
    pickFile();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Edit profile photo" })).not.toBeInTheDocument(),
    );
    expect(uploadDocument).not.toHaveBeenCalled();
    expect(useWorkforceStore.getState().personalInfo.profilePicture).toBeUndefined();
  });

  it("rejects unsupported file types before opening the cropper", () => {
    renderStep();
    pickFile("doc.pdf", "application/pdf");
    expect(screen.queryByRole("dialog", { name: "Edit profile photo" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert").textContent).toMatch(/isn't supported/i);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("rejects oversized files before opening the cropper", () => {
    renderStep();
    pickFile("big.png", "image/png", 6 * 1024 * 1024);
    expect(screen.queryByRole("dialog", { name: "Edit profile photo" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert").textContent).toMatch(/under 5 mb/i);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("surfaces an upload failure instead of pretending the photo was set", async () => {
    uploadDocument.mockRejectedValue(new Error("nope"));
    renderStep();
    pickFile();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(/couldn't upload/i),
    );
    expect(useWorkforceStore.getState().personalInfo.profilePicture).toBeUndefined();
    expect(screen.queryByRole("img", { name: "Your profile photo" })).not.toBeInTheDocument();
  });

  it("sends profilePicture: null when the photo was removed", () => {
    const state = makeFormState({
      personalInfo: {
        ...makeFormState().personalInfo,
        profilePicture: {
          url: "https://cdn.example.com/old.png",
          key: "uploads/old.png",
        },
        profilePictureRemoved: true,
      },
    });
    const payload = toSelfServicePayload(normalize(state), {
      "personal-info": true,
    }) as Record<string, unknown>;
    expect(payload.profilePicture).toBeNull();
  });
});

describe("self-service read-only fields", () => {
  it.each(["designation", "companyAssignedEmail"])("renders %s read-only", (id) => {
    renderStep();
    const el = document.getElementById(id) as HTMLInputElement;
    expect(el).toBeTruthy();
    expect(el.readOnly).toBe(true);
  });

  it("renders the mailbox provider select disabled", () => {
    renderStep();
    const el = document.getElementById("companyEmailProvider") as HTMLSelectElement;
    expect(el.disabled).toBe(true);
  });
});
