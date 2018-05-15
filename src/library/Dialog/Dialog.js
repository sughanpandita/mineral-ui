/* @flow */
import React, { cloneElement, Component } from 'react';
import Transition from 'react-transition-group/Transition';
import { createStyledComponent } from '../styles';
import { generateId, findByType } from '../utils';
import Portal from '../Portal';
import EventListener from '../EventListener';
import DialogBody from './DialogBody';
import DialogFooter from './DialogFooter';
import DialogHeader from './DialogHeader';

type Props = {
  /** TODO */
  children: React$Node,
  /** TODO */
  closeOnEscape?: boolean,
  /** TODO */
  closeOnClickOutside?: boolean,
  /** TODO */
  hideOverlay?: boolean,
  /** Id of the Dialog */
  id?: string,
  /**
   * Determines whether the Dialog is open.
   */
  isOpen?: boolean,
  /** TODO */
  modeless?: boolean,
  /** Called when Dialog is closed */
  onClose?: () => void,
  /** Called when Dialog is opened */
  onOpen?: () => void,
  /** TODO */
  size?: 'small' | 'medium' | 'large',
  /** @Private TODO */
  usePortal?: boolean
};

type State = {
  isExited: boolean,
  isExiting: boolean
};

export const componentTheme = (baseTheme: Object) => ({
  Dialog_zIndex: baseTheme.zIndex_100,

  DialogContent_backgroundColor: baseTheme.panel_backgroundColor,
  DialogContent_borderColor: baseTheme.panel_borderColor,
  DialogContent_borderRadius: baseTheme.borderRadius_1,
  DialogContent_boxShadow: baseTheme.boxShadow_5,
  DialogContent_zIndex: baseTheme.zIndex_200,
  DialogContent_margin: baseTheme.space_inset_lg,
  DialogContent_maxWidth: '80%',

  DialogOverlay_backgroundColor: 'rgba(0, 0, 0, 0.6)',

  ...baseTheme
});

const ANIMATION_DURATION_MS = 250; // TODO: Make prop or theme variable?

const styles = {
  overlay: ({ theme: baseTheme }) => {
    let theme = componentTheme(baseTheme);

    return {
      backgroundColor: theme.DialogOverlay_backgroundColor,
      bottom: 0,
      left: 0,
      overflow: 'hidden',
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: -1
    };
  },
  content: ({ theme: baseTheme }) => {
    let theme = componentTheme(baseTheme);

    return {
      backgroundColor: theme.DialogContent_backgroundColor,
      border: `1px solid ${theme.DialogContent_borderColor}`,
      borderRadius: theme.DialogContent_borderRadius,
      boxShadow: theme.DialogContent_boxShadow,
      display: 'flex',
      flex: '0 1 auto',
      flexDirection: 'column',
      margin: theme.DialogContent_margin,
      maxHeight: '90vh',
      maxWidth: theme.DialogContent_maxWidth
    };
  },
  root: ({ theme: baseTheme }) => {
    let theme = componentTheme(baseTheme);

    return {
      alignItems: 'flex-start',
      bottom: 0,
      display: 'flex',
      justifyContent: 'center',
      left: 0,
      position: 'fixed',
      right: 0,
      top: 0,
      zIndex: theme.Dialog_zIndex
    };
  },
  animate: ({ state }) => ({
    opacity: state === 'entered' ? 1 : 0,
    transition: `opacity ${ANIMATION_DURATION_MS}ms ease`,
    willChange: 'opacity'
  })
};

const Root = createStyledComponent('div', styles.root, {
  displayName: 'Dialog',
  includeStyleReset: true
});

const Overlay = createStyledComponent('div', styles.overlay, {
  displayName: 'Overlay'
});

const DialogContent = createStyledComponent('div', styles.content, {
  displayName: 'DialogContent'
});

const Animate = createStyledComponent('div', styles.animate, {
  displayName: 'Animate'
});

const Animation = ({ children, ...restProps }: Object) => {
  return (
    <Transition
      appear
      mountOnEnter
      timeout={ANIMATION_DURATION_MS}
      unmountOnExit
      {...restProps}>
      {(state) => <Animate state={state}>{children}</Animate>}
    </Transition>
  );
};

/**
 * Dialog - TODO
 */
export default class Dialog extends Component<Props, State> {
  static defaultProps: Object = {
    closeOnClickOutside: true,
    closeOnEscape: true,
    hideOverlay: false,
    usePortal: true
  };

  state: State = {
    isExited: false,
    isExiting: false
  };

  id: string = `dialog-${generateId()}`;

  dialogContent: ?HTMLElement;

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.isOpen && !this.props.isOpen) {
      this.setState({
        isExited: false
      });
    }
  }

  render() {
    const {
      children,
      closeOnClickOutside,
      closeOnEscape,
      isOpen,
      hideOverlay,
      usePortal,
      ...restProps
    } = this.props;
    const { isExited, isExiting } = this.state;

    if (isExited) {
      return null;
    }

    let [_header, body, footer] = this.extractComponentsFromChildren(children);

    const header = cloneElement(_header, {
      id: this.getHeaderId(),
      tabIndex: '-1'
    });

    const rootProps = {
      'aria-labelledby': this.getHeaderId(),
      'aria-modal': true,
      id: this.id,
      role: 'dialog',
      ...(closeOnClickOutside ? { onClick: this.handleClick } : undefined),
      ...restProps
    };

    const contentProps = {
      innerRef: this.setContentRef,
      role: 'document'
    };

    const animationProps = {
      in: isOpen && !isExiting,
      onExiting: this.handleExiting,
      onExited: this.handleExited,
      onEntered: this.handleEntered
    };

    const output = (
      <Animation {...animationProps}>
        <Root {...rootProps}>
          {!hideOverlay && <Overlay />}
          <DialogContent {...contentProps}>
            {header}
            {body}
            {footer}
          </DialogContent>
          {closeOnEscape && (
            <EventListener
              listeners={[
                {
                  target: 'document',
                  event: 'keydown',
                  handler: this.handleDocumentKeydown,
                  options: true
                }
              ]}
            />
          )}
        </Root>
      </Animation>
    );

    return usePortal ? <Portal>{output}</Portal> : output;
  }

  extractComponentsFromChildren = (children: React$Node) => {
    return [DialogHeader, DialogBody, DialogFooter].reduce((acc, type) => {
      const child = findByType(children, type);
      if (!child) {
        throw new Error(
          `[mineral-ui/Dialog]: Dialog must contain a ${type.name}.`
        );
      }
      acc.push(child);
      return acc;
    }, []);
  };

  getHeaderId = () => {
    return `${this.id}-header`;
  };

  setContentRef = (node: ?HTMLElement) => {
    this.dialogContent = node;
  };

  close = () => {
    this.handleExiting();
  };

  handleClick = (event: SyntheticEvent<>) => {
    if (this.isEventOutsideNode(event, this.dialogContent)) {
      this.close();
    }
  };

  handleDocumentKeydown = (event: SyntheticKeyboardEvent<>) => {
    if (event.key === 'Escape') {
      this.close();
    }
  };

  handleEntered = () => {
    this.props.onOpen && this.props.onOpen();
  };

  handleExiting = () => {
    this.setState({
      isExiting: true
    });
  };

  handleExited = () => {
    this.setState(
      {
        isExited: true,
        isExiting: false
      },
      () => {
        this.props.onClose && this.props.onClose();
      }
    );
  };

  isEventOutsideNode = (event: SyntheticEvent<>, node: ?HTMLElement) => {
    const { target } = event;

    return node && target && !node.contains(target);
  };
}
