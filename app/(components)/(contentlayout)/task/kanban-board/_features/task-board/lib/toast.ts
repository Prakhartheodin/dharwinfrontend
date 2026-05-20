import Swal from "sweetalert2";

interface ErrorOpts {
  correlationId?: string;
  action?: { label: string; onClick: () => void };
}

const POPUP_CLASS = "kb-swal-popup";

function footerFor(cid?: string) {
  return cid ? `Reference: ${cid}` : undefined;
}

export const toast = {
  error(message: string, opts: ErrorOpts = {}) {
    void Swal.fire({
      icon: "error",
      title: message,
      footer: footerFor(opts.correlationId),
      customClass: { popup: POPUP_CLASS },
      confirmButtonColor: "#d33",
    });
  },

  warning(message: string) {
    void Swal.fire({
      icon: "warning",
      title: message,
      customClass: { popup: POPUP_CLASS },
    });
  },
  success(message: string) {
    void Swal.fire({
      icon: "success",
      title: message,
      customClass: { popup: POPUP_CLASS },
      timer: 2000,
      showConfirmButton: false,
    });
  },
  confirm(message: string, opts: { title?: string } = {}) {
    return Swal.fire({
      icon: "warning",
      title: opts.title ?? "Confirm",
      text: message,
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      customClass: { popup: POPUP_CLASS },
    });
  },
};

